# Country Portrait assets

Optional AI-generated clips for long-press on flags.

## File naming

| File | Purpose |
|------|---------|
| `fr.mp4` | Looping video (ISO 3166-1 alpha-2, lowercase) |
| `fr-poster.jpg` | Poster / Ken Burns fallback |
| `manifest.json` | Optional path overrides |

## Style prompt (use for every country)

> Cinematic vertical 9:16 portrait, young man and woman in traditional [COUNTRY] folk costumes standing beside a large waving [COUNTRY] flag, soft golden hour light, shallow depth of field, subtle film grain, editorial travel documentary style, consistent character proportions, no text, no logos.

Replace `[COUNTRY]` with the English country name. Keep lighting and framing identical across all clips so the app feels unified.

## Technical

- H.264 MP4, muted, 5–15 s loop-friendly
- Resolution: 1080×1920 or 720×1280
- Keep file size reasonable for mobile bundles (< 5 MB per country if shipping many)
