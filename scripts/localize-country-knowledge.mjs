#!/usr/bin/env node
/**
 * Translate country-knowledge.json facts, subregion, and currencyName to all AppLangs.
 * Run: node scripts/localize-country-knowledge.mjs [lang ...]
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
const outPath = path.join(root, 'src/assets/data/country-knowledge.json');

const DELAY_MS = Number(process.env.DELAY_MS ?? 2000);
const SAVE_EVERY = Number(process.env.SAVE_EVERY ?? 15);

async function localizeLoc(field, lang) {
  const en = field?.en;
  if (!en || !needsTranslation(field, lang, en)) {
    return false;
  }
  field[lang] = await translateEnTo(lang, en);
  await sleep(DELAY_MS);
  return true;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const langs = process.argv.slice(2).filter((l) => APP_LANGS.includes(l));
  const toRun = langs.length ? langs : APP_LANGS;
  const entries = Object.entries(data.countries);

  for (const lang of toRun) {
    console.log(`\n== country-knowledge → ${lang} ==`);
    let done = 0;
    let i = 0;
    const total = entries.length;

    for (const [iso, entry] of entries) {
      i++;
      await localizeLoc(entry.subregion, lang);
      await localizeLoc(entry.currencyName, lang);
      for (const fact of entry.facts ?? []) {
        await localizeLoc(fact.text, lang);
      }
      done++;
      if (done % SAVE_EVERY === 0 || done === total) {
        fs.writeFileSync(outPath, `${JSON.stringify(data)}\n`);
        console.log(`  saved ${done}/${total} (${iso})`);
      }
    }
  }

  fs.writeFileSync(outPath, `${JSON.stringify(data)}\n`);
  console.log(`\nDone: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
