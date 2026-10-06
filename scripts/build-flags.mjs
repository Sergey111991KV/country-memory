#!/usr/bin/env node
/**
 * Bundles country flags into src/assets/flags/{iso2}.svg so they work offline
 * (previously every flag was fetched from flagcdn.com at runtime).
 *
 * Source: svg-country-flags (public domain, true aspect ratios).
 * Each SVG is minified with SVGO and gets explicit width/height from its viewBox
 * so <img> has an intrinsic size and can keep the real flag proportions.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules/svg-country-flags/svg');
const outDir = join(root, 'src/assets/flags');
const countries = JSON.parse(readFileSync(join(root, 'src/assets/data/countries.json'), 'utf8'))
  .countries.map((c) => c.iso2.toLowerCase());

/** Longest side in CSS px of the intrinsic size (layout still scales it). */
const BASE = 640;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let total = 0;
const missing = [];
for (const iso of countries) {
  let svg;
  try {
    svg = readFileSync(join(srcDir, `${iso}.svg`), 'utf8');
  } catch {
    missing.push(iso);
    continue;
  }
  const { data } = optimize(svg, {
    multipass: true,
    floatPrecision: 2,
    plugins: [
      { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
      'removeDimensions',
      { name: 'removeDesc', params: { removeAny: true } },
      'removeTitle',
    ],
  });
  const vb = data.match(/viewBox="([^"]+)"/);
  if (!vb) {
    throw new Error(`${iso}.svg has no viewBox`);
  }
  const [, , w, h] = vb[1].split(/[\s,]+/).map(Number);
  const scale = BASE / Math.max(w, h);
  const sized = data.replace(
    '<svg',
    `<svg width="${Math.round(w * scale)}" height="${Math.round(h * scale)}"`,
  );
  writeFileSync(join(outDir, `${iso}.svg`), sized);
  total += sized.length;
}

console.log(
  `flags: ${countries.length - missing.length} written, ${Math.round(total / 1024)} KB` +
    (missing.length ? `, missing: ${missing.join(', ')}` : ''),
);
if (missing.length) {
  process.exitCode = 1;
}
