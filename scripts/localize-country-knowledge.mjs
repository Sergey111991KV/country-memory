#!/usr/bin/env node
/**
 * Translate country-knowledge.json (facts, subregion, currencyName) via cached MT.
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
const cacheDir = path.join(__dirname, 'data/knowledge-cache');

const DELAY_MS = Number(process.env.DELAY_MS ?? 3500);
const SAVE_EVERY = Number(process.env.SAVE_EVERY ?? 20);

function seedCacheFromData(data, lang, map) {
  for (const entry of Object.values(data.countries)) {
    for (const field of [entry.subregion, entry.currencyName]) {
      const en = field?.en;
      const loc = field?.[lang];
      if (en && loc && loc !== en) {
        map[en] = loc;
      }
    }
    for (const fact of entry.facts ?? []) {
      const en = fact.text?.en;
      const loc = fact.text?.[lang];
      if (en && loc && loc !== en) {
        map[en] = loc;
      }
    }
  }
}

function loadCache(lang, data) {
  const p = path.join(cacheDir, `${lang}.json`);
  const map = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  if (data) {
    seedCacheFromData(data, lang, map);
  }
  return { path: p, map };
}

function saveCache({ path: p, map }) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(map)}\n`);
}

function collectEnStrings(data) {
  const set = new Set();
  for (const entry of Object.values(data.countries)) {
    if (entry.subregion?.en) {
      set.add(entry.subregion.en);
    }
    if (entry.currencyName?.en) {
      set.add(entry.currencyName.en);
    }
    for (const fact of entry.facts ?? []) {
      if (fact.text?.en) {
        set.add(fact.text.en);
      }
    }
  }
  return [...set];
}

function applyLang(data, lang, cache) {
  for (const entry of Object.values(data.countries)) {
    for (const field of [entry.subregion, entry.currencyName]) {
      if (field?.en && needsTranslation(field, lang, field.en)) {
        field[lang] = cache[field.en];
      }
    }
    for (const fact of entry.facts ?? []) {
      if (fact.text?.en && needsTranslation(fact.text, lang, fact.text.en)) {
        fact.text[lang] = cache[fact.text.en];
      }
    }
  }
}

async function fillCache(lang, enStrings, cacheStore) {
  let i = 0;
  const todo = enStrings.filter((en) => {
    if (!cacheStore.map[en]) {
      return true;
    }
    return false;
  });

  console.log(`  cache: ${Object.keys(cacheStore.map).length} hit, ${todo.length} to translate`);

  for (const en of todo) {
    i++;
    try {
      cacheStore.map[en] = await translateEnTo(lang, en);
    } catch (err) {
      console.warn(`  skip string (${i}/${todo.length}): ${err.message}`);
      cacheStore.map[en] = en;
    }
    if (i % 10 === 0 || i === todo.length) {
      saveCache(cacheStore);
      console.log(`  translated ${i}/${todo.length}`);
    }
    await sleep(DELAY_MS);
  }
  saveCache(cacheStore);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const langs = process.argv.slice(2).filter((l) => APP_LANGS.includes(l));
  const toRun = langs.length ? langs : APP_LANGS;
  const enStrings = collectEnStrings(data);

  for (const lang of toRun) {
    console.log(`\n== country-knowledge → ${lang} ==`);
    const cacheStore = loadCache(lang, data);
    await fillCache(lang, enStrings, cacheStore);
    applyLang(data, lang, cacheStore.map);
    fs.writeFileSync(outPath, `${JSON.stringify(data)}\n`);
    console.log(`  applied to ${outPath}`);
  }

  console.log(`\nDone: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
