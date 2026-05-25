# Billing implementation plan — Flagfield

## Done (in repo)

| Area | Status |
|------|--------|
| RevenueCat SDK (`@revenuecat/purchases-capacitor`) | ✅ |
| Platform keys (iOS `appl_…`, Android `goog_…`) | ✅ env |
| `SubscriptionService` — configure, purchase, restore, offerings | ✅ |
| Paywall UI — monthly / lifetime, store badge, legal copy | ✅ |
| Settings premium block + paywall CTA | ✅ |
| Premium-only Globe / Map on Play tab | ✅ |
| Free tier — 30 countries via `PlayPoolService` | ✅ |

## In progress (this sprint)

| # | Task | Purpose |
|---|------|---------|
| 1 | **Free session limit** — `canStartGame()` + paywall gate | 10 games then Premium |
| 2 | **Record completed sessions** on every mode end | Counter actually increments |
| 3 | **`ensurePlaySessionAccess`** on Play / quiz entry | Block start when limit hit |
| 4 | **Refresh billing on app resume** | Subscription from other device / restore |
| 5 | **Settings: Restore + Manage subscription** | Store-required flows |
| 6 | **Play hub** — free games left + limit banner | UX clarity |

## You configure (stores)

| Step | iOS | Android |
|------|-----|---------|
| App ID | `com.flagfield.learn` | same |
| Monthly sub | `flagfield_premium_monthly` | same + base plan |
| Lifetime (optional) | `flagfield_premium_lifetime` | managed product |
| RevenueCat | public iOS key | public Android key |
| Entitlement | `premium` | `premium` |
| Offering | default + `$rc_monthly` / `$rc_lifetime` | same |

Details: [REVENUECAT.md](REVENUECAT.md) · Release: [PUBLISH.md](PUBLISH.md)

## Later (optional)

- Intro / trial copy from RevenueCat `introPrice`
- Family sharing / promo codes (store dashboards)
- Server-side receipt validation (RevenueCat webhooks)
- Analytics events (purchase_started, purchase_success)
