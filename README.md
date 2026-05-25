# Flagfield

**Flagfield** is a mobile geography learning app (Ionic + Angular + Capacitor). Learn countries through **Globe Quest** (find on a 3D globe) and **Flag Quiz** (recognize flags with animated visuals). Progress, daily goals, and optional premium via RevenueCat.

- **App ID:** `com.flagfield.learn`
- **Dev server:** port **4205** (`npm start`)

## Requirements

- Node.js 20+
- Xcode (iOS) / Android Studio (Android) for native builds

## Install & run

```bash
npm install
npm start
```

Open `http://localhost:4205`. With `devMockBilling: true` in development, use **Paywall → Dev: mock premium** to test without the store.

## Build & test

```bash
npm run build
npm run test:ci
```

Native sync:

```bash
npm run cap:sync
```

## Documentation


| Topic                                   | Path                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| Project overview, monetization, release | [docs/README.md](docs/README.md)                                     |
| Privacy policy (template)               | [docs/legal/privacy-policy.md](docs/legal/privacy-policy.md)         |
| Terms of use (template)                 | [docs/legal/terms-of-use.md](docs/legal/terms-of-use.md)             |
| App Store listing copy                  | [docs/store/app-store-listing.md](docs/store/app-store-listing.md)   |
| Google Play listing copy                | [docs/store/play-store-listing.md](docs/store/play-store-listing.md) |


Before release: set live HTTPS URLs in `environment.prod.ts` for `privacyPolicyUrl` and `termsOfUseUrl`, and configure RevenueCat keys.

## Game modes

1. **Globe Quest** — rotating globe, pick a country, verify; feedback shows flag, capital, continent.
2. **Flag Quiz** — large animated flag, four choices, instant feedback per round (10 rounds = one game).

Free tier: **10 completed games** total, then subscription required. Premium unlocks unlimited play and full country catalog features.

## Data

- Country catalog: `src/assets/data/countries.json`
- GeoJSON for globe: `src/assets/geo/countries.geojson`
- Flag images: [FlagCDN](https://flagcdn.com) via `FlagAssetsService`

## License

Proprietary — see repository owner.  
  
  
npm run cap:sync:release

npm run cap:open:ios