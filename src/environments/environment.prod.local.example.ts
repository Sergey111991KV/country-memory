/**
 * Copy to `environment.prod.local.ts` (gitignored):
 *   npm run env:init
 *
 * REQUIRED before App Store / Play submit:
 * 1. PUBLIC_SITE — your HTTPS domain (no trailing slash)
 * 2. Product IDs in App Store Connect / Play Console (see billing.constants.ts)
 * 3. `androidMonthlyBasePlanId` — Google Play base plan id for monthly sub
 * 4. devMockBilling: true for TestFlight QA (tap = mock Premium); false before store submit
 *
 * Build: npm run build:release | npm run cap:sync:release
 */

/** Replace with your live site, e.g. https://flagfield.app (no trailing slash) */
const PUBLIC_SITE = 'https://YOUR_DOMAIN';

export const environment = {
  production: true,
  /** Set true only when App Store / Play products are ready for sale. */
  billingEnabled: false,
  freeGamesLimit: 10,
  donatePromptAfterGames: 10,
  androidMonthlyBasePlanId: 'monthly',
  /** false before App Store submit; never true in production builds. */
  devMockBilling: false,
  billingDebugEnabled: false,
  debugVerbose: false,

  privacyPolicyUrl: 'https://addeo.github.io/flagfield-privacy/',
  termsOfUseUrl: 'https://addeo.github.io/flagfield-terms',
  manageSubscriptionsUrlIos: 'https://apps.apple.com/account/subscriptions',
  manageSubscriptionsUrlAndroid:
    'https://play.google.com/store/account/subscriptions?package=com.flagfield.learn',

  supportEmail: 'supp0rt.serg@yandex.com',
  appVersion: '1.0.4',
  donateUrl: 'https://destream.net/live/SergeyKosilov/donate',
  developerWebsiteUrl: PUBLIC_SITE,
};
