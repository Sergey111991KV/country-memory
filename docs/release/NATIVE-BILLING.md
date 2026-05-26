# Native in-app purchases (App Store + Google Play)

Flagfield uses **native store billing only** — no RevenueCat or other third-party billing SDK.

| Layer | Package |
|-------|---------|
| Capacitor plugin | `@capgo/native-purchases` v8 (StoreKit 2 + Google Play Billing 7) |
| App service | `SubscriptionService` |
| Product IDs | `src/app/core/data/billing.constants.ts` |

## Store products

| Product | ID | Type |
|---------|-----|------|
| Monthly Premium | `flagfield_premium_monthly` | Auto-renewable subscription |
| Lifetime Premium | `flagfield_premium_lifetime` | Non-consumable in-app |

### iOS (App Store Connect)

1. Create subscription group and add `flagfield_premium_monthly`.
2. Create non-consumable `flagfield_premium_lifetime`.
3. Sandbox testers: App Store Connect → Users and Access → Sandbox.

### Android (Google Play Console)

1. Subscription `flagfield_premium_monthly` with a **base plan** (default id: `monthly`).
2. Set `environment.androidMonthlyBasePlanId` to that base plan id.
3. One-time product `flagfield_premium_lifetime`.
4. License testers in Play Console → Setup → License testing.

## Build & test

```bash
npm run build:release
npm run cap:sync:release
npm run cap:open:ios   # or cap:open:android
```

- Purchases work only on **device/simulator with store accounts**, not in the browser.
- Dev mock premium: `devMockBilling` / `billingDebugEnabled` in `environment.ts`.

## Entitlements

Premium is derived from active purchases returned by the stores:

- Lifetime: valid non-consumable purchase.
- Monthly: active subscription (`isActive` on iOS, `purchaseState === "1"` on Android).

Restore uses `restorePurchases()` + `getPurchases()`.

## Manage subscriptions

`SubscriptionService.openManageSubscriptions()` opens the native store UI when available, otherwise the platform URL from `environment.manageSubscriptionsUrlIos` / `manageSubscriptionsUrlAndroid`.

## Optional server validation

For production hardening, validate receipts server-side:

- iOS: App Store Server API / receipt verify
- Android: Google Play Developer API with `purchaseToken`

The plugin returns `receipt` (iOS) and `purchaseToken` (Android) on each transaction.
