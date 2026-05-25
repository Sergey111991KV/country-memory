#!/usr/bin/env node
/**
 * Generate src/app/core/i18n/flagfield/{lang}.ts from scripts/flagfield-translations/{lang}.json
 * Partial JSON is OK — index.ts merges each locale over FLAGFIELD_EN.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const OUT_DIR = path.join(ROOT, 'src/app/core/i18n/flagfield');

const LANGS = [
  'es',
  'de',
  'fr',
  'uk',
  'zh',
  'hi',
  'ar',
  'pt',
  'ja',
  'ko',
  'it',
  'tr',
  'vi',
  'id',
  'pl',
  'nl',
  'bn',
  'ur',
];

function constName(lang) {
  return `FLAGFIELD_${lang.toUpperCase()}`;
}

function emitTs(lang, data) {
  const lines = [`export const ${constName(lang)}: Record<string, string> = {`];
  for (const [key, value] of Object.entries(data)) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  }
  lines.push('};', '');
  fs.writeFileSync(path.join(OUT_DIR, `${lang}.ts`), lines.join('\n'));
}

function loadJson(lang) {
  const file = path.join(JSON_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  let wrote = 0;
  let skipped = 0;

  for (const lang of LANGS) {
    const data = loadJson(lang);
    if (!data || Object.keys(data).length === 0) {
      console.warn(`${lang}: no JSON — skip (uses English via index)`);
      if (!fs.existsSync(path.join(OUT_DIR, `${lang}.ts`))) {
        emitTs(lang, {});
      }
      skipped++;
      continue;
    }
    emitTs(lang, data);
    console.log(`Wrote ${lang}.ts (${Object.keys(data).length} keys)`);
    wrote++;
  }

  console.log(`\nDone: ${wrote} updated, ${skipped} without JSON.`);
}

main();
