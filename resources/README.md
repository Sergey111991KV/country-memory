# App icon & splash sources (Flagfield)

- `logo.svg` — source artwork (globe + flag on ocean gradient).
- `icon-1024.png` — **1024×1024** PNG for App Store Connect / Play Console (generated from `logo.svg`).

## Generate iOS / Android / PWA assets

```bash
npm run assets:generate
npm run cap:sync
```

This updates:

| Platform | Output |
|----------|--------|
| iOS | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Android | `android/app/src/main/res/mipmap-*/ic_launcher*.png` |
| PWA | `src/assets/icons/icon-*.webp` |

For store release builds:

```bash
npm run cap:sync:release
```

After `assets:generate`, copy the iOS icon for store upload:

```bash
cp ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png resources/icon-1024.png
```

Colors (aligned with the Ocean palette in Settings):

| Asset | Light | Dark |
|-------|-------|------|
| Icon background | `#f0f9ff` | `#1e3a8a` |
| Splash background | `#f0f9ff` | `#0f172a` |

These match `package.json` → `assets:generate` (`iconBackgroundColor`, `splashBackgroundColor`).

## Store review tips

- Apple/Google prefer a **simple icon** without tiny text. This mark is graphic-only.
- If review asks for a flat PNG, export `logo.svg` to **1024×1024 PNG** and replace the foreground in Capacitor Assets config.
