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
  /** false = free app + donate prompts; true = restore Premium IAP. */
  billingEnabled: false,
  freeGamesLimit: 10,
  donatePromptAfterGames: 10,
  androidMonthlyBasePlanId: 'monthly',
  devMockBilling: false,
  billingDebugEnabled: false,
  /** Production: no console debug traces */
  debugVerbose: false,
  privacyPolicyUrl: 'https://addeo.github.io/flagfield-privacy/',
  termsOfUseUrl: 'https://addeo.github.io/flagfield-terms',
  manageSubscriptionsUrlIos: 'https://apps.apple.com/account/subscriptions',
  manageSubscriptionsUrlAndroid:
    'https://play.google.com/store/account/subscriptions?package=com.flagfield.learn',

  /** Shown on Settings — contact for help */
  supportEmail: 'supp0rt.serg@yandex.com',

  appVersion: '1.0.3',
  donateUrl: 'https://destream.net/live/SergeyKosilov/donate',
  developerWebsiteUrl: 'https://addeo.github.io',
};
