# Billing implementation plan — Flagfield

## Done (in repo)

| Area | Status |
|------|--------|
| Native IAP (`@capgo/native-purchases`) | ✅ |
| `SubscriptionService` — products, purchase, restore | ✅ |
| Paywall UI — monthly / lifetime, store badge, legal copy | ✅ |
| Settings premium block + paywall CTA | ✅ |
| Premium-only Globe / Map on Play tab | ✅ |
| Free tier — 30 countries via `PlayPoolService` | ✅ |
| Free session limit — 10 games | ✅ |

## You configure (stores only)

| Step | iOS | Android |
|------|-----|---------|
| App ID | `com.flagfield.learn` | same |
| Monthly sub | `flagfield_premium_monthly` | same + base plan `monthly` |
| Lifetime | `flagfield_premium_lifetime` | managed product |
| Sandbox / license testers | App Store Sandbox | Play license testing |

Details: [NATIVE-BILLING.md](NATIVE-BILLING.md) · Release: [PUBLISH.md](PUBLISH.md)

## Later (optional)

- Server-side receipt validation (App Store Server API + Play Developer API)
- Intro / trial copy from store product metadata
- Family sharing / promo codes (store dashboards)
