# Store screenshots — Flagfield

Capture on **iPhone 6.7"** (or required size per store) and **Android phone** per Play Console specs.

## Prepare

```bash
npm start
# http://localhost:4205
```

For native chrome (status bar): run on simulator after `npm run cap:sync`.

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
