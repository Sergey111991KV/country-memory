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
  isBadTranslation,
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
      const en = field?.en;
      const translated = en ? cache[en] : undefined;
      if (en && translated && translated !== en && needsTranslation(field, lang, en)) {
        field[lang] = translated;
      }
    }
    for (const fact of entry.facts ?? []) {
      const en = fact.text?.en;
      const translated = en ? cache[en] : undefined;
      if (en && translated && translated !== en && needsTranslation(fact.text, lang, en)) {
        fact.text[lang] = translated;
      }
    }
  }
}

function loadData() {
  return JSON.parse(fs.readFileSync(outPath, 'utf8'));
}

function persistLang(lang, cache) {
  const data = loadData();
  applyLang(data, lang, cache);
  fs.writeFileSync(outPath, `${JSON.stringify(data)}\n`);
}

function isTrivialString(en) {
  return en.length <= 2 || /^[\s\—\-–·]+$/.test(en);
}

async function fillCache(lang, enStrings, cacheStore) {
  let i = 0;
  for (const en of enStrings) {
    if (isTrivialString(en) && !cacheStore.map[en]) {
      cacheStore.map[en] = en;
    }
  }
  const todo = enStrings.filter((en) => !cacheStore.map[en]);

  console.log(`  cache: ${Object.keys(cacheStore.map).length} hit, ${todo.length} to translate`);

  for (const en of todo) {
    i++;
    try {
      const out = await translateEnTo(lang, en);
      if (out && !isBadTranslation(out, en)) {
        cacheStore.map[en] = out;
      }
    } catch (err) {
      console.warn(`  skip string (${i}/${todo.length}): ${err.message}`);
    }
    if (i % 10 === 0 || i === todo.length) {
      saveCache(cacheStore);
      persistLang(lang, cacheStore.map);
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
    persistLang(lang, cacheStore.map);
    console.log(`  applied to ${outPath}`);
  }

  console.log(`\nDone: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
