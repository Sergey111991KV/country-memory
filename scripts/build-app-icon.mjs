#!/usr/bin/env node
/**
 * Rebuild Flagfield app icon assets from vector sources.
 *
 * Outputs:
 *  - resources/liquid-glass/png/*.png
 *  - resources/icon-1024.png (opaque master for App Store Connect)
 *  - ios/App/App/AppIcon.icon/Assets (SVG + PNG layers)
 *  - ios/.../AppIcon.appiconset/AppIcon-512@2x.png (legacy fallback)
 *
 * Liquid Glass lighting lives in AppIcon.icon/icon.json (Icon Composer).
 * Do not bake shadows/gloss into the SVGs.
 */
import { mkdirSync, readFileSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgDir = join(root, 'resources/liquid-glass/svg');
const pngDir = join(root, 'resources/liquid-glass/png');
const iconBundle = join(root, 'ios/App/App/AppIcon.icon');
const iconAssets = join(iconBundle, 'Assets');

mkdirSync(pngDir, { recursive: true });
mkdirSync(iconAssets, { recursive: true });

async function rasterize(name, { flatten = false, bg } = {}) {
  const svg = readFileSync(join(svgDir, name));
  let pipeline = sharp(svg, { density: 300 }).resize(1024, 1024).ensureAlpha();
  if (flatten) {
    pipeline = pipeline.flatten({ background: bg ?? '#1D4ED8' });
  }
  const out = join(pngDir, name.replace('.svg', '.png'));
  await pipeline.png().toFile(out);
  return out;
}

async function main() {
  await rasterize('1-background.svg', { flatten: true, bg: '#1D4ED8' });
  await rasterize('2-globe-ring.svg');
  await rasterize('3-hero-flag.svg');

  const master = join(root, 'resources/icon-1024.png');
  await sharp(join(pngDir, '1-background.png'))
    .composite([
      { input: join(pngDir, '2-globe-ring.png') },
      { input: join(pngDir, '3-hero-flag.png') },
    ])
    .removeAlpha()
    .png()
    .toFile(master);

  await sharp(master).toFile(join(pngDir, '0-composite.png'));

  for (const name of ['2-globe-ring', '3-hero-flag']) {
    copyFileSync(join(svgDir, `${name}.svg`), join(iconAssets, `${name}.svg`));
    copyFileSync(join(pngDir, `${name}.png`), join(iconAssets, `${name}.png`));
  }

  const legacy = join(
    root,
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  );
  if (existsSync(dirname(legacy))) {
    copyFileSync(master, legacy);
  }

  if (!existsSync(join(iconBundle, 'icon.json'))) {
    writeFileSync(
      join(iconBundle, 'icon.json'),
      `${JSON.stringify(
        {
          fill: {
            'automatic-gradient':
              'extended-srgb:0.14510,0.38824,0.92157,1.00000',
          },
          groups: [
            {
              name: 'Foreground',
              layers: [
                {
                  glass: true,
                  hidden: false,
                  'image-name': '3-hero-flag.svg',
                  name: 'Hero Flag',
                  opacity: 1,
                  position: { scale: 1, 'translation-in-points': [0, 0] },
                },
              ],
              shadow: { kind: 'neutral', opacity: 0.45 },
              specular: true,
              translucency: { enabled: true, value: 0.28 },
            },
            {
              name: 'Mid',
              layers: [
                {
                  glass: true,
                  hidden: false,
                  'image-name': '2-globe-ring.svg',
                  name: 'Globe Ring',
                  opacity: 1,
                  position: { scale: 1, 'translation-in-points': [0, 0] },
                },
              ],
              shadow: { kind: 'neutral', opacity: 0.35 },
              specular: true,
              translucency: { enabled: true, value: 0.55 },
            },
          ],
          'supported-platforms': {
            circles: ['watchOS'],
            squares: 'shared',
          },
        },
        null,
        2,
      )}\n`,
    );
  }

  console.log('App icon assets rebuilt.');
  console.log('  Master:', master);
  console.log('  Liquid Glass:', iconBundle);
  console.log('Next: npm run assets:generate && open ios/App/App.xcodeproj');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
