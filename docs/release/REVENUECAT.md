# RevenueCat + store products — Flagfield

> **Deprecated.** Flagfield now uses **native App Store / Google Play billing** only.  
> See **[NATIVE-BILLING.md](NATIVE-BILLING.md)** for current setup.

**Bundle ID:** `com.flagfield.learn`  
**Entitlement ID in app:** `premium`  
**Free tier:** 10 completed game sessions (`freeGamesLimit`)

---

## 1. Apple App Store Connect

1. Create app **Flagfield** with bundle ID `com.flagfield.learn`.
2. **Subscriptions** (or **In-App Purchases**):
   - **Auto-renewable subscription** — e.g. `flagfield_premium_monthly`  
     Display name: *Flagfield Premium Monthly*
   - **Non-consumable** (optional) — e.g. `flagfield_premium_lifetime`  
     Display name: *Flagfield Premium Lifetime*
3. Subscription group, pricing, localization.
4. **Agreements, Tax, and Banking** — complete before testing purchases.
5. Create **Sandbox** tester in Users and Access.

Suggested product IDs (you can change; update RevenueCat + fallbacks in env):

| Product | Type | Example product ID |
|---------|------|---------------------|
| Monthly | Auto-renewable | `flagfield_premium_monthly` |
| Lifetime | Non-consumable | `flagfield_premium_lifetime` |

---

## 2. Google Play Console

1. Create app with package `com.flagfield.learn`.
2. **Monetize → Products**:
   - **Subscription:** `flagfield_premium_monthly` (base plan monthly)
   - **In-app product** (optional): `flagfield_premium_lifetime` (managed, non-consumable)
3. Activate products after review where required.
4. **License testers** for internal testing.

---

## 3. RevenueCat dashboard

1. [app.revenuecat.com](https://app.revenuecat.com) → New project **Flagfield**.
2. **Apps** → add iOS (bundle `com.flagfield.learn`) and Android (same package).
3. Link App Store Connect API key and Google Play service credentials.
4. **Products** → import / map store product IDs from sections 1–2.
5. **Entitlements** → create `premium` → attach monthly + lifetime products.
6. **Offerings** → default offering (e.g. `default`) with packages:
   - Monthly → `$rc_monthly` or your package id
   - Lifetime → `$rc_lifetime` or custom id
7. **API keys** → copy **public** SDK keys:
   - iOS: `appl_...`
   - Android: `goog_...`

---

## 4. Platform behavior in the app

| Platform | RevenueCat key | Store UI |
|----------|----------------|----------|
| iOS | `revenueCatIosKey` (`appl_…`) | App Store — manage at Apple subscriptions URL |
| Android | `revenueCatAndroidKey` (`goog_…`) | Google Play — manage at Play subscriptions URL |
| Web / browser | — | Paywall shows “purchases in mobile apps only”; dev mock via `devMockBilling` |

On launch, `SubscriptionService` picks the key from `Capacitor.getPlatform()`, configures RevenueCat, syncs purchases on Android, and listens for entitlement updates.

---

## 5. App configuration

`src/environments/environment.prod.local.ts`:

```typescript
export const environment = {
  production: true,
  revenueCatIosKey: 'appl_XXXXXXXXXXXX',
  revenueCatAndroidKey: 'goog_XXXXXXXXXXXX',
  premiumEntitlementId: 'premium',
  freeGamesLimit: 10,
  revenueCatOfferingId: '', // or 'default' if you named offering
  monthlyPackageIdentifierFallback: '$rc_monthly',
  lifetimePackageIdentifierFallback: '$rc_lifetime',
  devMockBilling: false,
  // ... legal URLs ...
};
```

Build:

```bash
npm run cap:sync:release
```

Test on **real device** with sandbox (iOS) or license tester (Android).

---

## 6. Paywall behavior (app)

- After **10** completed sessions, new games require Premium.
- Paywall loads offerings from RevenueCat; prices come from the store.
- Dev only: `devMockBilling: true` in `environment.ts` enables mock premium in browser.

---

## 7. Store compliance text

Subscription disclosure is in:

- `docs/legal/terms-of-use.md` (section 4)
- `docs/store/app-store-listing.md`
- `docs/store/play-store-listing.md`

Privacy for purchases: `docs/legal/privacy-policy.md` (section 2.3).

---

## 8. Troubleshooting

| Issue | Check |
|-------|--------|
| No prices on paywall | Products approved; RevenueCat offering current; keys in prod.local |
| Premium not unlocking | Entitlement id exactly `premium`; products attached to entitlement |
| iOS sandbox fails | Sandbox Apple ID; paid agreements active |
| Android test fails | License tester email; app signed with upload key |

Support: RevenueCat docs + supp0rt.serg@yandex.com for app-specific issues.
