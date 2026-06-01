#!/usr/bin/env node
/** Apply scripts/data/knowledge-cache/{lang}.json → country-knowledge.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_LANGS } from './lib/mt-translate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'src/assets/data/country-knowledge.json');
const cacheDir = path.join(__dirname, 'data/knowledge-cache');

function applyLang(data, lang, cache) {
  let applied = 0;
  for (const entry of Object.values(data.countries)) {
    for (const field of [entry.subregion, entry.currencyName]) {
      const en = field?.en;
      const translated = en ? cache[en] : undefined;
      if (en && translated && translated !== en) {
        field[lang] = translated;
        applied++;
      }
    }
    for (const fact of entry.facts ?? []) {
      const en = fact.text?.en;
      const translated = en ? cache[en] : undefined;
      if (en && translated && translated !== en) {
        fact.text[lang] = translated;
        applied++;
      }
    }
  }
  return applied;
}

const langs = process.argv.slice(2).filter((l) => APP_LANGS.includes(l));
const toRun = langs.length ? langs : APP_LANGS;

const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
for (const lang of toRun) {
  const cachePath = path.join(cacheDir, `${lang}.json`);
  if (!fs.existsSync(cachePath)) {
    console.log(`${lang}: no cache`);
    continue;
  }
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const n = applyLang(data, lang, cache);
  console.log(`${lang}: applied ${n} fields from cache`);
}
fs.writeFileSync(outPath, `${JSON.stringify(data)}\n`);
