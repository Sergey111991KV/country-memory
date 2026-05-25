import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  Purchases,
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import { PACKAGE_TYPE } from '@revenuecat/purchases-typescript-internal-esm';

import { environment } from '../../../environments/environment';
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

function isPurchasesError(err: unknown): err is { code: string; message?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly locale = inject(LocaleService);
  private readonly appLog = inject(AppLogService);
  private readonly storage = inject(StorageService);

  private initialized = false;
  private customerInfoListenerId: string | null = null;

  readonly billingPlatformSig = signal<BillingStorePlatform>(detectBillingStorePlatform());
  readonly readySig = signal(false);
  readonly storeConfiguredSig = signal(false);
  readonly initErrorMessageSig = signal<string | null>(null);
  readonly hasEntitlementSig = signal(false);
  readonly premiumKindSig = signal<PremiumKind>('none');
  readonly premiumExpiresIsoSig = signal<string | null>(null);
  readonly premiumProductIdSig = signal<string | null>(null);
  readonly monthlyPackageSig = signal<PurchasesPackage | null>(null);
  readonly lifetimePackageSig = signal<PurchasesPackage | null>(null);
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

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.billingPlatformSig.set(detectBillingStorePlatform());
    this.storeConfiguredSig.set(this.detectStoreConfigured());
    await this.syncDebugPremiumFromStorage();
    await this.logBilling('init_start', {
      platform: this.billingPlatformSig(),
      storeConfigured: this.storeConfiguredSig(),
      canPurchaseInApp: this.canPurchaseInAppSig(),
    });

    try {
      if (this.canPurchaseInAppSig()) {
        const apiKey = this.apiKeyForPlatform();
        await Purchases.configure({ apiKey });
        if (!environment.production) {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        }
        await this.registerCustomerInfoListener();
        if (this.billingPlatformSig() === 'android') {
          await Purchases.syncPurchases();
        }
        const { customerInfo } = await Purchases.getCustomerInfo();
        this.applyCustomerInfo(customerInfo);
        await this.refreshOfferings();
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
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.applyCustomerInfo(customerInfo);
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
      const offerings = await Purchases.getOfferings();
      this.applyOfferings(offerings);
    } finally {
      this.offeringsLoadingSig.set(false);
    }
  }

  async purchaseMonthly(): Promise<'success' | 'cancelled' | 'error'> {
    const pkg = this.monthlyPackageSig();
    if (!pkg) {
      return 'error';
    }
    return this.purchasePackage(pkg);
  }

  async purchaseLifetime(): Promise<'success' | 'cancelled' | 'error'> {
    const pkg = this.lifetimePackageSig();
    if (!pkg) {
      return 'error';
    }
    return this.purchasePackage(pkg);
  }

  async restore(): Promise<'success' | 'empty' | 'error'> {
    if (!this.canPurchaseInApp()) {
      if (this.debugPremiumActive()) {
        await this.logBilling('restore_skipped_debug_premium');
        return 'success';
      }
      await this.logBilling('restore_unavailable');
      return 'error';
    }
    try {
      await this.logBilling('restore_start');
      const { customerInfo } = await Purchases.restorePurchases();
      this.applyCustomerInfo(customerInfo);
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
    const url = this.manageSubscriptionsUrl();
    if (!url) {
      return;
    }
    await Browser.open({ url });
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

  private async purchasePackage(
    aPackage: PurchasesPackage,
  ): Promise<'success' | 'cancelled' | 'error'> {
    if (!this.canPurchaseInApp()) {
      await this.logBilling('purchase_unavailable');
      return 'error';
    }
    try {
      await this.logBilling('purchase_start', {
        packageId: aPackage.identifier,
        productId: aPackage.product.identifier,
      });
      const { customerInfo } = await Purchases.purchasePackage({ aPackage });
      this.applyCustomerInfo(customerInfo);
      await this.logBilling('purchase_success', {
        packageId: aPackage.identifier,
        subscribed: this.isSubscribed(),
      });
      return 'success';
    } catch (err) {
      if (
        isPurchasesError(err) &&
        err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        await this.logBilling('purchase_cancelled', {
          packageId: aPackage.identifier,
        });
        return 'cancelled';
      }
      await this.logBilling(
        'purchase_error',
        {
          packageId: aPackage.identifier,
          message: err instanceof Error ? err.message : String(err),
          code: isPurchasesError(err) ? err.code : undefined,
        },
        'error',
      );
      return 'error';
    }
  }

  private async registerCustomerInfoListener(): Promise<void> {
    if (this.customerInfoListenerId) {
      return;
    }
    this.customerInfoListenerId = await Purchases.addCustomerInfoUpdateListener(
      (customerInfo) => {
        this.applyCustomerInfo(customerInfo);
      },
    );
  }

  private applyOfferings(offerings: PurchasesOfferings): void {
    const offeringId = environment.revenueCatOfferingId?.trim();
    const offering =
      (offeringId ? offerings.all[offeringId] : undefined) ??
      offerings.current ??
      null;

    if (!offering) {
      this.monthlyPackageSig.set(null);
      this.lifetimePackageSig.set(null);
      this.monthlyPriceSig.set(null);
      this.lifetimePriceSig.set(null);
      return;
    }

    const monthly =
      offering.monthly ??
      offering.availablePackages.find(
        (p) =>
          p.identifier === environment.monthlyPackageIdentifierFallback ||
          p.packageType === PACKAGE_TYPE.MONTHLY,
      ) ??
      null;

    const lifetime =
      offering.lifetime ??
      offering.availablePackages.find(
        (p) =>
          p.identifier === environment.lifetimePackageIdentifierFallback ||
          p.packageType === PACKAGE_TYPE.LIFETIME,
      ) ??
      null;

    this.monthlyPackageSig.set(monthly);
    this.lifetimePackageSig.set(lifetime);
    this.monthlyPriceSig.set(monthly?.product.priceString ?? null);
    this.lifetimePriceSig.set(lifetime?.product.priceString ?? null);
  }

  private applyCustomerInfo(info: CustomerInfo): void {
    const id = environment.premiumEntitlementId;
    const ent = info.entitlements.active[id] as PurchasesEntitlementInfo | undefined;
    const active = Boolean(ent?.isActive);
    this.hasEntitlementSig.set(active);
    void this.logBilling('customer_info_applied', {
      entitlementId: id,
      active,
      productId: ent?.productIdentifier ?? null,
      periodType: ent?.periodType ?? null,
      expirationDate: ent?.expirationDate ?? null,
      willRenew: ent?.willRenew ?? null,
      activeEntitlements: Object.keys(info.entitlements.active),
    });
    if (!ent || !active) {
      this.premiumKindSig.set('none');
      this.premiumExpiresIsoSig.set(null);
      this.premiumProductIdSig.set(null);
      return;
    }
    this.premiumKindSig.set(this.resolvePremiumKind(ent));
    this.premiumExpiresIsoSig.set(ent.expirationDate ?? null);
    this.premiumProductIdSig.set(ent.productIdentifier ?? null);
  }

  private resolvePremiumKind(ent: PurchasesEntitlementInfo): PremiumKind {
    const productId = (ent.productIdentifier ?? '').toLowerCase();
    if (productId.includes('lifetime') || productId.includes('forever')) {
      return 'lifetime';
    }
    switch (ent.periodType) {
      case 'TRIAL':
        return 'trial';
      case 'INTRO':
        return 'intro';
      case 'NORMAL':
        return ent.willRenew === false && !ent.expirationDate ? 'lifetime' : 'subscription';
      default:
        return 'unknown';
    }
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
      this.premiumKindSig.set('unknown');
      this.premiumExpiresIsoSig.set(null);
      this.premiumProductIdSig.set('billing_debug');
    }
  }

  private async logBilling(
    event: string,
    data?: Record<string, unknown>,
    level: 'info' | 'warn' | 'error' = 'info',
  ): Promise<void> {
    await this.appLog.log('billing', event, data, level);
  }

  private detectStoreConfigured(): boolean {
    if (this.billingPlatformSig() === 'ios') {
      return Boolean(environment.revenueCatIosKey?.trim());
    }
    if (this.billingPlatformSig() === 'android') {
      return Boolean(environment.revenueCatAndroidKey?.trim());
    }
    return false;
  }

  private apiKeyForPlatform(): string {
    if (this.billingPlatformSig() === 'ios') {
      return environment.revenueCatIosKey.trim();
    }
    if (this.billingPlatformSig() === 'android') {
      return environment.revenueCatAndroidKey.trim();
    }
    throw new Error('Purchases unsupported on this platform');
  }
}
