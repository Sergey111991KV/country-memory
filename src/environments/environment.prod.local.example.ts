/**
 * Copy to `environment.prod.local.ts` (gitignored):
 *   npm run env:init
 *
 * REQUIRED before App Store / Play submit:
 * 1. PUBLIC_SITE — your HTTPS domain (no trailing slash)
 * 2. revenueCatIosKey + revenueCatAndroidKey
 * 3. devMockBilling: false
 *
 * Build: npm run build:release | npm run cap:sync:release
 */

/** Replace with your live site, e.g. https://flagfield.app (no trailing slash) */
const PUBLIC_SITE = 'https://YOUR_DOMAIN';

export const environment = {
  production: true,
  revenueCatIosKey: 'appl_YOUR_IOS_PUBLIC_KEY',
  revenueCatAndroidKey: 'goog_YOUR_ANDROID_PUBLIC_KEY',
  premiumEntitlementId: 'premium',
  freeGamesLimit: 10,
  revenueCatOfferingId: '',
  monthlyPackageIdentifierFallback: '$rc_monthly',
  lifetimePackageIdentifierFallback: '$rc_lifetime',
  devMockBilling: false,
  /** Set true only for App Review / sandbox QA builds. */
  billingDebugEnabled: false,
  debugVerbose: false,

  privacyPolicyUrl: 'https://addeo.github.io/flagfield-privacy/en',
  termsOfUseUrl: 'https://addeo.github.io/flagfield-terms',
  manageSubscriptionsUrlIos: 'https://apps.apple.com/account/subscriptions',
  manageSubscriptionsUrlAndroid:
    'https://play.google.com/store/account/subscriptions?package=com.flagfield.learn',

  supportEmail: 'supp0rt.serg@yandex.com',
  appVersion: '1.0.1',
  donateUrl: `${PUBLIC_SITE}/donate`,
  developerWebsiteUrl: PUBLIC_SITE,
};
