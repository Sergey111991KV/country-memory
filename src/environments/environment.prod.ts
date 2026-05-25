/**
 * Production defaults (e.g. CI `ng build`). For local store builds with secrets,
 * use `environment.prod.local.ts` (see `environment.prod.local.example.ts`).
 *
 * Before App Store / Play submission: set `privacyPolicyUrl` and `termsOfUseUrl`
 * to your live HTTPS pages (match store listings where required). Placeholder
 * hosts keep Privacy/Terms buttons disabled in the app.
 */
export const environment = {
  production: true,
  revenueCatIosKey: '',
  revenueCatAndroidKey: '',
  premiumEntitlementId: 'premium',
  freeGamesLimit: 10,
  revenueCatOfferingId: '',
  monthlyPackageIdentifierFallback: '$rc_monthly',
  lifetimePackageIdentifierFallback: '$rc_lifetime',
  devMockBilling: false,
  billingDebugEnabled: false,
  /** Production: no console debug traces */
  debugVerbose: false,
  privacyPolicyUrl: 'https://addeo.github.io/flagfield-privacy/en',
  termsOfUseUrl: 'https://addeo.github.io/flagfield-terms',
  manageSubscriptionsUrlIos: 'https://apps.apple.com/account/subscriptions',
  manageSubscriptionsUrlAndroid:
    'https://play.google.com/store/account/subscriptions?package=com.flagfield.learn',

  /** Shown on Settings — contact for help */
  supportEmail: 'supp0rt.serg@yandex.com',

  appVersion: '1.0.1',
  donateUrl: '',
  developerWebsiteUrl: 'https://addeo.github.io',
};
