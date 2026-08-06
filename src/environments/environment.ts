export const environment = {
  production: false,
  /**
   * When true: Premium gating + in-app purchases (paywall).
   * When false: all modes free; donate prompts after N games / monthly.
   * Flip to true to restore store billing without rewriting the app.
   */
  billingEnabled: false,
  /** Finished game sessions before Premium is required (only if billingEnabled). */
  freeGamesLimit: 10,
  /** Show donate prompt after this many completed sessions (only if !billingEnabled). */
  donatePromptAfterGames: 10,
  /**
   * Google Play base plan id for `flagfield_premium_monthly` (Subscriptions → Base plans).
   */
  androidMonthlyBasePlanId: 'monthly',

  /**
   * When true (dev only), browser builds can toggle premium via localStorage.
   * Set to false for production builds. Ignored when billingEnabled is false.
   */
  devMockBilling: true,

  /** Show billing debug toggle (mock Premium) in Support settings. Ignored when billingEnabled is false. */
  billingDebugEnabled: true,

  /**
   * Verbose `appDebugLog` traces. Set to `false` to mute in dev.
   */
  debugVerbose: true,

  /**
   * Public HTTPS links (replace host/path before release).
   * Must not use example.com — those hosts keep legal buttons disabled.
   */
  privacyPolicyUrl: 'https://addeo.github.io/flagfield-privacy/',
  termsOfUseUrl: 'https://addeo.github.io/flagfield-terms',
  /** Apple subscription management (required context for auto-renewable subs) */
  manageSubscriptionsUrlIos: 'https://apps.apple.com/account/subscriptions',
  /** Google Play subscription management */
  manageSubscriptionsUrlAndroid:
    'https://play.google.com/store/account/subscriptions?package=com.flagfield.learn',

  /** Shown on Settings — contact for help */
  supportEmail: 'supp0rt.serg@yandex.com',

  /** Shown on About — sync with package.json for store builds */
  appVersion: '1.0.4',

  /**
   * Optional HTTPS tip link (Ko-fi, PayPal.me, etc.). Empty or placeholder host
   * keeps the tip button disabled with a short message.
   */
  donateUrl: 'https://destream.net/live/SergeyKosilov/donate',

  /** Optional HTTPS project or developer site */
  developerWebsiteUrl: 'https://test.flagfield.dev',
};
