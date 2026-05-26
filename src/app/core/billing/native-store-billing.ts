import { Capacitor } from '@capacitor/core';
import {
  NativePurchases,
  PURCHASE_TYPE,
  type Product,
  type Transaction,
} from '@capgo/native-purchases';

import {
  BILLING_STORE_PRODUCT_IDS,
  type BillingStoreProductId,
} from '../data/billing.constants';
import type { BillingStorePlatform } from '../utils/billing-platform';
import type { StoreProductInfo } from './store-product.types';

export function isNativeStoreBillingAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkNativeBillingSupported(): Promise<boolean> {
  if (!isNativeStoreBillingAvailable()) {
    return false;
  }
  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  return isBillingSupported;
}

export async function loadStoreProducts(
  platform: BillingStorePlatform,
  androidMonthlyBasePlanId: string,
): Promise<{ monthly: StoreProductInfo | null; lifetime: StoreProductInfo | null }> {
  const monthlyId = BILLING_STORE_PRODUCT_IDS.monthly;
  const lifetimeId = BILLING_STORE_PRODUCT_IDS.lifetime;

  const [subsResult, lifetimeResult] = await Promise.all([
    NativePurchases.getProducts({
      productIdentifiers: [monthlyId],
      productType: PURCHASE_TYPE.SUBS,
    }),
    NativePurchases.getProduct({
      productIdentifier: lifetimeId,
      productType: PURCHASE_TYPE.INAPP,
    }),
  ]);

  const monthly = pickMonthlyProduct(
    subsResult.products,
    monthlyId,
    platform,
    androidMonthlyBasePlanId,
  );
  const lifetime = mapLifetimeProduct(lifetimeResult.product, lifetimeId);

  return { monthly, lifetime };
}

export async function purchaseStoreProduct(
  product: StoreProductInfo,
): Promise<Transaction> {
  const productType =
    product.kind === 'lifetime' ? PURCHASE_TYPE.INAPP : PURCHASE_TYPE.SUBS;

  return NativePurchases.purchaseProduct({
    productIdentifier: product.productId,
    productType,
    planIdentifier: product.planIdentifier,
  });
}

export async function restoreNativePurchases(): Promise<Transaction[]> {
  await NativePurchases.restorePurchases();
  return fetchActivePurchases();
}

export async function fetchActivePurchases(): Promise<Transaction[]> {
  const [inapp, subs] = await Promise.all([
    NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.INAPP,
      onlyCurrentEntitlements: true,
    }),
    NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS,
      onlyCurrentEntitlements: true,
    }),
  ]);
  return [...inapp.purchases, ...subs.purchases];
}

export function isPurchaseCancelledError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const normalized = message.toLowerCase();
  return (
    normalized.includes('cancel') ||
    normalized.includes('user cancelled') ||
    normalized.includes('user canceled')
  );
}

export function transactionGrantsPremium(
  transaction: Transaction,
  productIds: typeof BILLING_STORE_PRODUCT_IDS,
): boolean {
  if (transaction.revocationDate) {
    return false;
  }

  if (transaction.productIdentifier === productIds.lifetime) {
    return isValidOneTimePurchase(transaction);
  }

  if (transaction.productIdentifier === productIds.monthly) {
    return isActiveSubscription(transaction);
  }

  return false;
}

export function resolvePremiumFromTransactions(
  transactions: Transaction[],
): {
  active: boolean;
  productId: string | null;
  expiresIso: string | null;
  willCancel: boolean | null;
  isTrial: boolean;
  isIntro: boolean;
} {
  const lifetime = transactions.find(
    (t) =>
      t.productIdentifier === BILLING_STORE_PRODUCT_IDS.lifetime &&
      isValidOneTimePurchase(t),
  );
  if (lifetime) {
    return {
      active: true,
      productId: lifetime.productIdentifier,
      expiresIso: null,
      willCancel: null,
      isTrial: false,
      isIntro: false,
    };
  }

  const monthly = transactions
    .filter(
      (t) =>
        t.productIdentifier === BILLING_STORE_PRODUCT_IDS.monthly &&
        isActiveSubscription(t),
    )
    .sort((a, b) => {
      const aTime = Date.parse(a.purchaseDate);
      const bTime = Date.parse(b.purchaseDate);
      return bTime - aTime;
    })[0];

  if (monthly) {
    return {
      active: true,
      productId: monthly.productIdentifier,
      expiresIso: monthly.expirationDate ?? null,
      willCancel: monthly.willCancel ?? null,
      isTrial: monthly.isTrialPeriod === true,
      isIntro: monthly.isInIntroPricePeriod === true,
    };
  }

  return {
    active: false,
    productId: null,
    expiresIso: null,
    willCancel: null,
    isTrial: false,
    isIntro: false,
  };
}

function pickMonthlyProduct(
  products: Product[],
  monthlyId: BillingStoreProductId,
  platform: BillingStorePlatform,
  androidMonthlyBasePlanId: string,
): StoreProductInfo | null {
  const matches = products.filter(
    (p) => p.planIdentifier === monthlyId || p.identifier === monthlyId,
  );
  if (matches.length === 0) {
    return null;
  }

  if (platform === 'android') {
    const preferred =
      matches.find((p) => p.identifier === androidMonthlyBasePlanId) ??
      matches[0];
    return mapMonthlyProduct(preferred, monthlyId, platform);
  }

  return mapMonthlyProduct(matches[0], monthlyId, platform);
}

function mapMonthlyProduct(
  product: Product,
  monthlyId: string,
  platform: BillingStorePlatform,
): StoreProductInfo {
  if (platform === 'android') {
    return {
      productId: product.planIdentifier ?? monthlyId,
      title: product.title,
      priceString: product.priceString,
      kind: 'monthly',
      planIdentifier: product.identifier,
      offerToken: product.offerToken,
    };
  }

  return {
    productId: monthlyId,
    title: product.title,
    priceString: product.priceString,
    kind: 'monthly',
  };
}

function mapLifetimeProduct(
  product: Product,
  lifetimeId: string,
): StoreProductInfo | null {
  if (!product?.priceString) {
    return null;
  }
  return {
    productId: lifetimeId,
    title: product.title,
    priceString: product.priceString,
    kind: 'lifetime',
  };
}

function isValidOneTimePurchase(transaction: Transaction): boolean {
  if (transaction.revocationDate) {
    return false;
  }
  if (transaction.purchaseState !== undefined) {
    return transaction.purchaseState === '1';
  }
  return true;
}

function isActiveSubscription(transaction: Transaction): boolean {
  if (transaction.revocationDate) {
    return false;
  }

  if (transaction.isActive === true) {
    return true;
  }

  if (transaction.subscriptionState) {
    return (
      transaction.subscriptionState === 'subscribed' ||
      transaction.subscriptionState === 'inGracePeriod' ||
      transaction.subscriptionState === 'inBillingRetryPeriod'
    );
  }

  if (transaction.expirationDate) {
    return Date.parse(transaction.expirationDate) > Date.now();
  }

  if (transaction.purchaseState !== undefined) {
    return transaction.purchaseState === '1';
  }

  return false;
}
