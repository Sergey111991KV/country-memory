/** Store product IDs — must match App Store Connect and Google Play Console. */
export const BILLING_STORE_PRODUCT_IDS = {
  monthly: 'flagfield_premium_monthly',
  lifetime: 'flagfield_premium_lifetime',
} as const;

export type BillingStoreProductId =
  (typeof BILLING_STORE_PRODUCT_IDS)[keyof typeof BILLING_STORE_PRODUCT_IDS];

/** Default Google Play base plan id for the monthly subscription. */
export const BILLING_ANDROID_MONTHLY_BASE_PLAN_ID = 'monthly';
