# Store screenshots — Flagfield

## iOS — App Store Connect **6.5" Display**

Apple accepts **only** these pixel sizes (portrait or landscape):

| Orientation | Size |
|-------------|------|
| Portrait | **1242 × 2688** or **1284 × 2778** |
| Landscape | **2688 × 1242** or **2778 × 1284** |

### Capture (recommended)

1. Xcode Simulator → **iPhone 15 Plus** / **iPhone 15 Pro Max**, or **iPhone 17** then resize.
2. Log in once (display name), use **light** theme, English UI.
3. `File → Save Screen` (⌘S) or `xcrun simctl io booted screenshot shot.png`.
4. Check size: `sips -g pixelWidth -g pixelHeight shot.png`.

Resize / letterbox:

```bash
pip3 install Pillow   # once
python3 scripts/resize-app-store-screenshots.py screenshots/ios/raw-final/*.png \
  -o screenshots/ios/app-store-6.5 --preset 1284x2778
```

Automated capture (dev server must be running):

```bash
npx ng serve --port 4200
node scripts/capture-app-store-screenshots.mjs
```

### iPad — **13" Display** (required — app supports iPad)

Portrait: **2064 × 2752** · Landscape: **2752 × 2064**

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

## Required scenes (current Liquid Glass UI)

| # | File | Screen | How |
|---|------|--------|-----|
| 1 | `01-play-hub.png` | Play hub | `/tabs/play` — mini flag quiz + Play CTA + full tab bar |
| 2 | `02-knowledge.png` | Knowledge | `/tabs/knowledge` — collections + country list |
| 3 | `03-globe-quest.png` | Globe Quest | `/tabs/play/globe-find` — globe with a country highlighted |
| 4 | `04-map-quest.png` | Map Quest | `/tabs/play/map-find` — flat map with target |
| 5 | `05-flag-quiz.png` | Flag Quiz | `/tabs/play/challenge/flag_pick_country` — flag + 4 answers |
| 6 | `06-country-portrait.png` | Country Portrait | Culture modal (long-press flag where enabled) |
| 7 | `07-progress.png` | Progress | `/tabs/progress` — daily goal + stats |
| 8 | `08-knowledge-quiz.png` | Knowledge Quiz | `/tabs/play/knowledge-quiz` — country knowledge challenge |
| 9 | `09-learning-path.png` | Learning Path | `/tabs/play/learn` — guided country-learning levels |
| 10 | `10-about-game.png` | How It Works | `/tabs/play/about-game` — learning modes and progress overview |

Ready-to-upload folders:

- `screenshots/ios/app-store-6.5/` → **1284×2778**
- `screenshots/ios/app-store-ipad-13/` → **2064×2752** (letterboxed)

## Tips

- Use **light** theme consistently across the set.
- English UI is fine for the global store; add Russian screenshots for RU localization if desired.
- Hide debug overlays; `debugVerbose: false` in release.
- No personal data in the display name field.
- Before upload, confirm the **tab bar is fully visible** on Play / Knowledge / Progress (not covered by glass cards).

## File naming

```
screenshots/ios/app-store-6.5/01-play-hub.png
...
screenshots/ios/app-store-ipad-13/01-play-hub.png
```

Keep raw captures outside git or in `screenshots/ios/raw*` (large files).
