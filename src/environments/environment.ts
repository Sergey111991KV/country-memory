export const environment = {
  production: false,
  /** RevenueCat public SDK keys from the RevenueCat dashboard */
  revenueCatIosKey: '',
  revenueCatAndroidKey: '',
  /** Must match the entitlement identifier in RevenueCat (subscription AND lifetime should unlock this). */
  premiumEntitlementId: 'premium',
  /** Finished game sessions before subscription is required. */
  freeGamesLimit: 10,
  /**
   * Optional: use a specific offering id from RevenueCat instead of the default "current" offering.
   */
  revenueCatOfferingId: '',
  /**
   * Fallback if `offering.monthly` is null: match `package.identifier` (e.g. custom id from dashboard).
   */
  monthlyPackageIdentifierFallback: '$rc_monthly',
  /**
   * Fallback if `offering.lifetime` is null: match `package.identifier` or `packageType === LIFETIME`.
   */
  lifetimePackageIdentifierFallback: '$rc_lifetime',

  /**
   * When true (dev only), browser builds can toggle premium via localStorage.
   * Set to false for production builds.
   */
  devMockBilling: true,

  /** Show billing debug toggle (mock Premium) in Support settings. */
  billingDebugEnabled: true,

  /**
   * Verbose `appDebugLog` traces. Set to `false` to mute in dev.
   */
  debugVerbose: true,

  /**
   * Public HTTPS links (replace host/path before release).
   * Must not use example.com — those hosts keep legal buttons disabled.
   */
  privacyPolicyUrl: 'https://addeo.github.io/flagfield-privacy/en',
  termsOfUseUrl: 'https://addeo.github.io/flagfield-terms',
  /** Apple subscription management (required context for auto-renewable subs) */
  manageSubscriptionsUrlIos: 'https://apps.apple.com/account/subscriptions',
  /** Google Play subscription management */
  manageSubscriptionsUrlAndroid:
    'https://play.google.com/store/account/subscriptions?package=com.flagfield.learn',

  /** Shown on Settings — contact for help */
  supportEmail: 'supp0rt.serg@yandex.com',

  /** Shown on About — sync with package.json for store builds */
  appVersion: '1.0.1',

  /**
   * Optional HTTPS tip link (Ko-fi, PayPal.me, etc.). Empty or placeholder host
   * keeps the tip button disabled with a short message.
   */
  donateUrl: 'https://test.flagfield.dev/donate',

  /** Optional HTTPS project or developer site */
  developerWebsiteUrl: 'https://test.flagfield.dev',
};
