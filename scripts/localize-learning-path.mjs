#!/usr/bin/env node
/**
 * Add AppLang translations to learning-path.json title/subtitle fields.
 * Run: node scripts/localize-learning-path.mjs [lang ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APP_LANGS,
  needsTranslation,
  sleep,
  translateEnTo,
} from './lib/mt-translate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'src/assets/data/learning-path.json');

const DELAY_MS = Number(process.env.DELAY_MS ?? 1200);

async function localizeField(field, lang) {
  const en = field.en;
  if (!en || !needsTranslation(field, lang, en)) {
    return;
  }
  field[lang] = await translateEnTo(lang, en);
  await sleep(DELAY_MS);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const langs = process.argv.slice(2).filter((l) => APP_LANGS.includes(l));
  const toRun = langs.length ? langs : APP_LANGS;

  for (const lang of toRun) {
    console.log(`\n== learning-path → ${lang} ==`);
    for (const level of data.levels) {
      await localizeField(level.title, lang);
      await localizeField(level.subtitle, lang);
      console.log(`  ${level.id} ok`);
    }
    fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  }

  console.log(`\nSaved ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
