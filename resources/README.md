# App icon & splash sources (Flagfield)

Liquid Glass (iOS 26+) app icon: **globe ring + one hero flag**.

## Source layout

| Path | Role |
|------|------|
| `logo.svg` | Capacitor / legacy master (full square, **no** baked corner radius) |
| `icon-1024.png` | Opaque 1024×1024 for App Store Connect / Play |
| `liquid-glass/svg/1-background.svg` | Flat ocean gradient (legacy composite only) |
| `liquid-glass/svg/2-globe-ring.svg` | Mid layer — globe silhouette |
| `liquid-glass/svg/3-hero-flag.svg` | Foreground — abstract tricolor flag |
| `ios/App/App/AppIcon.icon/` | Icon Composer bundle (Liquid Glass) |

In-app mark: `src/assets/brand/flagfield-mark.svg` (same symbol, no background).

## Rebuild icons

```bash
# Vector → PNG layers + AppIcon.icon Assets + icon-1024.png
npm run assets:icon

# Capacitor iOS/Android/PWA bitmaps from resources/logo.svg
npm run assets:generate
npm run cap:sync
```

Colors (aligned with Ocean / Liquid Glass UI):

| Asset | Light | Dark |
|-------|-------|------|
| Icon Composer fill | `#2563eb` gradient | system Dark appearance |
| Splash background | `#f0f9ff` | `#0f172a` |

`assets:generate` still uses `iconBackgroundColor` / `splashBackgroundColor` from `package.json`.

## Liquid Glass / Icon Composer

1. Open **Xcode → Open Developer Tool → Icon Composer**, or select `AppIcon.icon` in the project.
2. Layers are already grouped: **Foreground** (flag) + **Mid** (globe). Fill is Flagfield blue.
3. Tweak Specular / Translucency / Dark / Clear / Tinted in the inspector — **do not** bake gloss into the SVGs.
4. Target **General → App Icons** must be named `AppIcon` (matches `AppIcon.icon`).

Xcode 26+ compiles `AppIcon.icon` for Home Screen Liquid Glass and generates fallback images for older OS versions.

Legacy `Assets.xcassets/AppIcon.appiconset` remains as a flat fallback for tooling that still reads the asset catalog; the Composer file takes precedence when present.

## Store tips

- Upload `resources/icon-1024.png` to App Store Connect (1024×1024, no alpha).
- Graphic only — no tiny text (HIG).
- Abstract tricolor is intentional (not a specific national flag).
