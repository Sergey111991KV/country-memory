# Flagfield — project documentation

## 1. Product

**Flagfield** teaches world geography for learners of all ages.

| Mode | Route | Description |
|------|--------|-------------|
| Globe Quest | `/tabs/play/globe-find` | 3D political globe (Three.js + three-globe). Natural Earth 50m polygons. |
| Map Quest | `/tabs/play/map-find` | 2D political map (Leaflet + same country dataset). |
| Flag Quiz | `/tabs/play/quiz` | Animated flags, four choices, 10 rounds per session. |

**Country Portrait:** long-press a flag → full-screen scene (video if `assets/country-scenes/XX.mp4` exists, else illustrated fallback).

**Tabs:** Home · Play · Progress · Settings

**Progress:** `UserLearningService` records attempts per country and mode (`globe_find`, `map_find`, `quiz`).

## 2. Monetization

- **Free:** 10 completed game sessions (`SessionAccessService`, `environment.freeGamesLimit`).
- **Premium:** RevenueCat entitlement `premium` — monthly and/or lifetime.
- **Dev:** `devMockBilling: true` + Paywall “Dev: mock premium”.

Configure release keys in **`src/environments/environment.prod.local.ts`** (copy from `environment.prod.local.example.ts`).

## 3. Release (publish yourself)

**Main guide (RU):** [release/PUBLISH.md](release/PUBLISH.md)

| Step | Command / doc |
|------|------------------|
| Legal HTML | `npm run legal:build` → upload [legal/public/](legal/public/) |
| Host HTTPS | [release/HOSTING-LEGAL.md](release/HOSTING-LEGAL.md) |
| Env secrets | `npm run env:init` → edit `environment.prod.local.ts` |
| RevenueCat | [release/REVENUECAT.md](release/REVENUECAT.md) |
| Native build | `npm run cap:sync:release` |
| App Store copy | [store/app-store-listing.md](store/app-store-listing.md) |
| Play copy | [store/play-store-listing.md](store/play-store-listing.md) |
| Play Data safety | [store/data-safety-play.md](store/data-safety-play.md) |
| App Store Privacy | [store/app-store-privacy.md](store/app-store-privacy.md) |

Replace `YOUR_DOMAIN` everywhere (see [store/URLS.template.txt](store/URLS.template.txt)).

## 4. Local development

```bash
npm start          # http://localhost:4205
npm run test:ci
npm run lint
npm run assets:generate   # after changing resources/logo.svg
```

## 5. Repository layout

```
src/app/
  core/           services, i18n, data types, utils
  home/           landing, daily goal, play CTA
  play/           hub, globe-find, map-find, quiz
  progress/       learning stats
  settings/       language, theme, premium, legal links
  paywall/
  shared/         flag-display, country-culture-modal
src/assets/
  data/countries.json
  geo/countries.geojson
  globe/          bundled earth textures
  country-scenes/ manifest + optional AI videos per ISO
  brand/
resources/        logo.svg → capacitor assets
```

## 6. Related docs

- [Globe Quest](globe-quest.md)
- [Privacy policy](legal/privacy-policy.md)
- [Terms of use](legal/terms-of-use.md)
