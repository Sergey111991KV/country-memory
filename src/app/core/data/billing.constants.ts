/** Store product IDs — must match App Store Connect, Play Console, and RevenueCat. */
export const BILLING_STORE_PRODUCT_IDS = {
  monthly: 'flagfield_premium_monthly',
  lifetime: 'flagfield_premium_lifetime',
} as const;

/** RevenueCat entitlement identifier. */
export const BILLING_ENTITLEMENT_ID = 'premium';
