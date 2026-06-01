import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { NativePurchases } from '@capgo/native-purchases';
import type { Transaction } from '@capgo/native-purchases';

import { environment } from '../../../environments/environment';
import {
  checkNativeBillingSupported,
  fetchActivePurchases,
  isNativeStoreBillingAvailable,
  isPurchaseCancelledError,
  loadStoreProducts,
  purchaseStoreProduct,
  resolvePremiumFromTransactions,
  restoreNativePurchases,
} from '../billing/native-store-billing';
import type { StoreProductInfo } from '../billing/store-product.types';
import {
  detectBillingStorePlatform,
  isNativeBillingPlatform,
  type BillingStorePlatform,
} from '../utils/billing-platform';
import { LocaleService } from './locale.service';
import { AppLogService } from './app-log.service';
import { StorageService } from './storage.service';

export type PremiumKind = 'none' | 'lifetime' | 'subscription' | 'trial' | 'intro' | 'unknown';

const DEBUG_PREMIUM_KEY = 'flagfield_billing_debug_premium';
const LEGACY_DEV_PREMIUM_KEY = 'flagfield_dev_premium';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly locale = inject(LocaleService);
  private readonly appLog = inject(AppLogService);
  private readonly storage = inject(StorageService);

  private initialized = false;
  private transactionListenerRegistered = false;

  readonly billingPlatformSig = signal<BillingStorePlatform>(detectBillingStorePlatform());
  readonly readySig = signal(false);
  readonly storeConfiguredSig = signal(false);
  readonly initErrorMessageSig = signal<string | null>(null);
  readonly hasEntitlementSig = signal(false);
  readonly premiumKindSig = signal<PremiumKind>('none');
  readonly premiumExpiresIsoSig = signal<string | null>(null);
  readonly premiumProductIdSig = signal<string | null>(null);
  readonly monthlyProductSig = signal<StoreProductInfo | null>(null);
  readonly lifetimeProductSig = signal<StoreProductInfo | null>(null);
  readonly monthlyPriceSig = signal<string | null>(null);
  readonly lifetimePriceSig = signal<string | null>(null);
  readonly offeringsLoadingSig = signal(false);
  readonly debugPremiumSig = signal(false);

  readonly isSubscribedSig = computed(() => {
    if (this.debugPremiumSig()) {
      return true;
    }
    return this.hasEntitlementSig();
  });

  readonly canPurchaseInAppSig = computed(
    () =>
      isNativeBillingPlatform(this.billingPlatformSig()) &&
      this.storeConfiguredSig(),
  );

  readonly canSimulateBillingSig = computed(() => this.canSimulateBilling());

  readonly canSubscribeMonthlySig = computed(
    () => this.canSimulateBilling() || (this.canPurchaseInApp() && !!this.monthlyProductSig()),
  );

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.billingPlatformSig.set(detectBillingStorePlatform());
    await this.syncDebugPremiumFromStorage();
    await this.logBilling('init_start', {
      platform: this.billingPlatformSig(),
      canPurchaseInApp: this.canPurchaseInAppSig(),
    });

    try {
      if (isNativeStoreBillingAvailable()) {
        const supported = await checkNativeBillingSupported();
        this.storeConfiguredSig.set(supported);
        if (supported) {
          await this.registerTransactionListener();
          await this.syncEntitlementFromStore();
          await this.refreshOfferings();
        } else {
          this.initErrorMessageSig.set('Native billing is not supported on this device.');
        }
      } else if (this.canUseBillingDebug()) {
        await this.syncDebugPremiumFromStorage();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.initErrorMessageSig.set(msg);
      await this.logBilling('init_error', { message: msg }, 'error');
    } finally {
      this.readySig.set(true);
      await this.logBilling('init_complete', {
        subscribed: this.isSubscribed(),
        debugPremium: this.debugPremiumSig(),
        hasEntitlement: this.hasEntitlementSig(),
      });
    }
  }

  isSubscribed(): boolean {
    return this.isSubscribedSig();
  }

  hasPremiumAccess(): boolean {
    return this.isSubscribed();
  }

  canPurchaseInApp(): boolean {
    return this.canPurchaseInAppSig();
  }

  storeLabelKey(): string {
    switch (this.billingPlatformSig()) {
      case 'ios':
        return 'billing.store.appStore';
      case 'android':
        return 'billing.store.googlePlay';
      default:
        return 'billing.store.web';
    }
  }

  storeLabel(): string {
    return this.locale.translate(this.storeLabelKey());
  }

  canUseBillingDebug(): boolean {
    return (
      environment.billingDebugEnabled ||
      environment.devMockBilling ||
      !environment.production
    );
  }

  /** Test / dev: simulate monthly Premium when the store is unavailable or devMockBilling is on. */
  canSimulateBilling(): boolean {
    if (!this.canUseBillingDebug()) {
      return false;
    }
    return environment.devMockBilling || !this.canPurchaseInApp();
  }

  canSubscribeMonthly(): boolean {
    return this.canSubscribeMonthlySig();
  }

  debugPremiumActive(): boolean {
    return this.debugPremiumSig();
  }

  async toggleDebugPremium(): Promise<void> {
    if (!this.canUseBillingDebug()) {
      return;
    }
    const next = !this.debugPremiumSig();
    this.debugPremiumSig.set(next);
    await this.storage.set(DEBUG_PREMIUM_KEY, next);
    if (typeof localStorage !== 'undefined') {
      if (next) {
        localStorage.setItem(LEGACY_DEV_PREMIUM_KEY, '1');
      } else {
        localStorage.removeItem(LEGACY_DEV_PREMIUM_KEY);
      }
    }
    await this.logBilling('debug_premium_toggled', { active: next });
    if (next) {
      this.applyMockMonthlySubscription();
    } else if (!this.hasEntitlementSig()) {
      this.premiumKindSig.set('unknown');
      this.premiumExpiresIsoSig.set(null);
      this.premiumProductIdSig.set(null);
    }
  }

  private applyMockMonthlySubscription(): void {
    this.premiumKindSig.set('subscription');
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);
    this.premiumExpiresIsoSig.set(expires.toISOString());
    this.premiumProductIdSig.set('flagfield_premium_monthly_mock');
  }

  async setDebugPremium(active: boolean): Promise<void> {
    if (!this.canUseBillingDebug()) {
      return;
    }
    this.debugPremiumSig.set(active);
    await this.storage.set(DEBUG_PREMIUM_KEY, active);
    await this.logBilling('debug_premium_set', { active });
  }

  async refreshBillingState(): Promise<void> {
    if (!this.canPurchaseInApp()) {
      await this.logBilling('refresh_skipped', { reason: 'not_native_store' });
      return;
    }
    try {
      await this.logBilling('refresh_start');
      await this.syncEntitlementFromStore();
      await this.refreshOfferings();
      await this.logBilling('refresh_success', {
        subscribed: this.isSubscribed(),
        hasEntitlement: this.hasEntitlementSig(),
      });
    } catch (err) {
      await this.logBilling(
        'refresh_error',
        { message: err instanceof Error ? err.message : String(err) },
        'error',
      );
    }
  }

  async refreshOfferings(): Promise<void> {
    if (!this.canPurchaseInApp()) {
      return;
    }
    this.offeringsLoadingSig.set(true);
    try {
      const { monthly, lifetime } = await loadStoreProducts(
        this.billingPlatformSig(),
        environment.androidMonthlyBasePlanId,
      );
      this.monthlyProductSig.set(monthly);
      this.lifetimeProductSig.set(lifetime);
      this.monthlyPriceSig.set(monthly?.priceString ?? null);
      this.lifetimePriceSig.set(lifetime?.priceString ?? null);
    } catch (err) {
      await this.logBilling(
        'offerings_error',
        { message: err instanceof Error ? err.message : String(err) },
        'error',
      );
      this.monthlyProductSig.set(null);
      this.lifetimeProductSig.set(null);
      this.monthlyPriceSig.set(null);
      this.lifetimePriceSig.set(null);
    } finally {
      this.offeringsLoadingSig.set(false);
    }
  }

  async purchaseMonthly(): Promise<'success' | 'cancelled' | 'error'> {
    if (this.canPurchaseInApp()) {
      const product = this.monthlyProductSig();
      if (!product) {
        return 'error';
      }
      return this.purchaseProduct(product);
    }
    if (this.canSimulateBilling()) {
      return this.simulateMonthlyPurchase();
    }
    await this.logBilling('purchase_unavailable');
    return 'error';
  }

  async purchaseLifetime(): Promise<'success' | 'cancelled' | 'error'> {
    await this.logBilling('purchase_lifetime_unavailable');
    return 'error';
  }

  /** Dev / test: grant monthly Premium without App Store / Play Billing. */
  async simulateMonthlyPurchase(): Promise<'success' | 'cancelled' | 'error'> {
    if (!this.canSimulateBilling()) {
      return 'error';
    }
    this.debugPremiumSig.set(true);
    this.applyMockMonthlySubscription();
    await this.storage.set(DEBUG_PREMIUM_KEY, true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEGACY_DEV_PREMIUM_KEY, '1');
    }
    await this.logBilling('simulate_monthly_purchase', {
      expiresIso: this.premiumExpiresIsoSig(),
    });
    return 'success';
  }

  async restore(): Promise<'success' | 'empty' | 'error'> {
    if (this.canSimulateBilling() && this.debugPremiumActive()) {
      await this.logBilling('restore_skipped_debug_premium');
      return 'success';
    }
    if (!this.canPurchaseInApp()) {
      await this.logBilling('restore_unavailable');
      return 'error';
    }
    try {
      await this.logBilling('restore_start');
      const purchases = await restoreNativePurchases();
      this.applyPurchases(purchases);
      const result = this.hasEntitlementSig() ? 'success' : 'empty';
      await this.logBilling('restore_complete', { result });
      return result;
    } catch (err) {
      await this.logBilling(
        'restore_error',
        { message: err instanceof Error ? err.message : String(err) },
        'error',
      );
      return 'error';
    }
  }

  async openManageSubscriptions(): Promise<void> {
    if (this.canPurchaseInApp()) {
      try {
        await NativePurchases.manageSubscriptions();
        return;
      } catch (err) {
        await this.logBilling(
          'manage_subscriptions_native_failed',
          { message: err instanceof Error ? err.message : String(err) },
          'warn',
        );
      }
    }
    const url = this.manageSubscriptionsUrl();
    if (url) {
      await Browser.open({ url });
    }
  }

  manageSubscriptionsUrl(): string | null {
    if (this.billingPlatformSig() === 'ios') {
      return environment.manageSubscriptionsUrlIos;
    }
    if (this.billingPlatformSig() === 'android') {
      return environment.manageSubscriptionsUrlAndroid;
    }
    return null;
  }

  billingBannerText(): string {
    const initErr = this.initErrorMessageSig();
    if (initErr) {
      return initErr;
    }
    if (!Capacitor.isNativePlatform()) {
      return this.locale.translate('paywall.webOnly');
    }
    if (!this.storeConfiguredSig()) {
      const key =
        this.billingPlatformSig() === 'ios'
          ? 'app.billingWarningIos'
          : this.billingPlatformSig() === 'android'
            ? 'app.billingWarningAndroid'
            : 'app.billingWarning';
      return this.locale.translate(key);
    }
    return this.locale.translate('app.billingWarning');
  }

  monthlyFinePrintKey(): string {
    if (this.billingPlatformSig() === 'ios') {
      return 'paywall.fineMonthlyIos';
    }
    if (this.billingPlatformSig() === 'android') {
      return 'paywall.fineMonthlyAndroid';
    }
    return 'paywall.fineMonthly';
  }

  lifetimeFinePrintKey(): string {
    if (this.billingPlatformSig() === 'ios') {
      return 'paywall.fineLifetimeIos';
    }
    if (this.billingPlatformSig() === 'android') {
      return 'paywall.fineLifetimeAndroid';
    }
    return 'paywall.fineLifetime';
  }

  private async purchaseProduct(
    product: StoreProductInfo,
  ): Promise<'success' | 'cancelled' | 'error'> {
    if (!this.canPurchaseInApp()) {
      await this.logBilling('purchase_unavailable');
      return 'error';
    }
    try {
      await this.logBilling('purchase_start', {
        productId: product.productId,
        kind: product.kind,
        planIdentifier: product.planIdentifier ?? null,
      });
      await purchaseStoreProduct(product);
      await this.syncEntitlementFromStore();
      await this.logBilling('purchase_success', {
        productId: product.productId,
        subscribed: this.isSubscribed(),
      });
      return 'success';
    } catch (err) {
      if (isPurchaseCancelledError(err)) {
        await this.logBilling('purchase_cancelled', {
          productId: product.productId,
        });
        return 'cancelled';
      }
      await this.logBilling(
        'purchase_error',
        {
          productId: product.productId,
          message: err instanceof Error ? err.message : String(err),
        },
        'error',
      );
      return 'error';
    }
  }

  private async registerTransactionListener(): Promise<void> {
    if (this.transactionListenerRegistered || this.billingPlatformSig() !== 'ios') {
      return;
    }
    this.transactionListenerRegistered = true;
    await NativePurchases.addListener('transactionUpdated', () => {
      void this.syncEntitlementFromStore();
    });
  }

  private async syncEntitlementFromStore(): Promise<void> {
    const purchases = await fetchActivePurchases();
    this.applyPurchases(purchases);
  }

  private applyPurchases(purchases: Transaction[]): void {
    const premium = resolvePremiumFromTransactions(purchases);
    this.hasEntitlementSig.set(premium.active);
    void this.logBilling('entitlement_applied', {
      active: premium.active,
      productId: premium.productId,
      expiresIso: premium.expiresIso,
      willCancel: premium.willCancel,
    });

    if (!premium.active) {
      this.premiumKindSig.set('none');
      this.premiumExpiresIsoSig.set(null);
      this.premiumProductIdSig.set(null);
      return;
    }

    const productId = premium.productId ?? '';
    if (productId.includes('lifetime')) {
      this.premiumKindSig.set('lifetime');
    } else if (premium.isTrial) {
      this.premiumKindSig.set('trial');
    } else if (premium.isIntro) {
      this.premiumKindSig.set('intro');
    } else {
      this.premiumKindSig.set('subscription');
    }
    this.premiumExpiresIsoSig.set(premium.expiresIso);
    this.premiumProductIdSig.set(premium.productId);
  }

  private async syncDebugPremiumFromStorage(): Promise<void> {
    if (!this.canUseBillingDebug()) {
      this.debugPremiumSig.set(false);
      return;
    }
    const stored = await this.storage.get<boolean>(DEBUG_PREMIUM_KEY);
    const legacy =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(LEGACY_DEV_PREMIUM_KEY) === '1';
    const active = stored === true || legacy;
    this.debugPremiumSig.set(active);
    if (active) {
      this.applyMockMonthlySubscription();
    }
  }

  private async logBilling(
    event: string,
    data?: Record<string, unknown>,
    level: 'info' | 'warn' | 'error' = 'info',
  ): Promise<void> {
    await this.appLog.log('billing', event, data, level);
  }
}
