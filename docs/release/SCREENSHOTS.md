# Store screenshots — Flagfield

## iOS — App Store Connect **6.5" Display**

Apple accepts **only** these pixel sizes (portrait or landscape):

| Orientation | Size |
|-------------|------|
| Portrait | **1242 × 2688** or **1284 × 2778** |
| Landscape | **2688 × 1242** or **2778 × 1284** |

### Capture (recommended)

1. Xcode Simulator → **iPhone 15 Plus** or **iPhone 15 Pro Max** (not iPhone 17 Pro unless you resize).
2. **Window → Physical Size** (or 100% scale) so PNG is full resolution.
3. **File → Save Screen** (⌘S) or `xcrun simctl io booted screenshot shot.png`.
4. Check size: `sips -g pixelWidth -g pixelHeight shot.png` — must match a row above.

If shots are small (e.g. 470 × 1024), the simulator window was scaled down. Resize:

```bash
pip3 install Pillow   # once
python3 scripts/resize-app-store-screenshots.py path/to/screenshots/*.png
# → screenshots/ios/app-store-6.5/01-....png at 1284×2778
```

Other preset: `--preset 1242x2688`

### iPad — **13" Display** (required — app supports iPad)

Portrait: **2064 × 2752** · Landscape: **2752 × 2064**

Capture on **iPad Pro 13-inch (M4)** simulator at Physical Size, or letterbox iPhone shots:

```bash
python3 scripts/resize-app-store-screenshots.py screenshots/ios/app-store-6.5/ \
  -o screenshots/ios/app-store-ipad-13 --preset 2064x2752 --letterbox
```

Upload at least **1** screenshot (up to 10) to **13-inch iPad** in Connect.

## Android

Capture on a **phone** size per Play Console specs.

## Prepare app

```bash
npm run cap:sync:release
# Run in Xcode on the screenshot simulator
```

## Required scenes

| # | Screen | How to get there |
|---|--------|------------------|
| 1 | Home | `/tabs/home` — daily goal visible |
| 2 | Play hub | `/tabs/play` — three mode cards |
| 3 | Globe Quest | Start Globe → globe visible with a country highlighted |
| 4 | Map Quest | Start Map → flat map with selection |
| 5 | Flag Quiz | Start Quiz → flag + 4 answers |
| 6 | Country Portrait | Long-press flag (~0.5s) → fullscreen scene |
| 7 | Progress | `/tabs/progress` — stats list |

## Tips

- Use **light** or **dark** theme consistently across set.
- English UI is fine for global store; add Russian screenshots for RU localization if desired.
- Hide debug overlays; `debugVerbose: false` in release.
- No personal data in display name field.

## File naming (suggested)

```
screenshots/ios/01-home.png
screenshots/ios/02-play-hub.png
...
screenshots/android/01-home.png
```

Keep originals outside repo or in a private folder (large files).
