#!/usr/bin/env node
/**
 * Translate flagfield en.json -> other locales via @vitalets/google-translate-api.
 * Usage: node scripts/translate-flagfield-google.mjs de fr uk ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translate } from '@vitalets/google-translate-api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const EN_PATH = path.join(JSON_DIR, 'en.json');

const TARGETS = {
  de: 'de',
  fr: 'fr',
  uk: 'uk',
  zh: 'zh-CN',
  hi: 'hi',
  ar: 'ar',
  pt: 'pt',
  ja: 'ja',
  ko: 'ko',
  it: 'it',
  tr: 'tr',
  vi: 'vi',
  id: 'id',
  pl: 'pl',
  nl: 'nl',
  bn: 'bn',
  ur: 'ur',
};

const DELAY_MS = Number(process.env.DELAY_MS ?? 400);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateOne(text, to) {
  const { text: out } = await translate(text, { from: 'en', to });
  return out;
}

async function translateLang(lang, en) {
  const to = TARGETS[lang];
  const outPath = path.join(JSON_DIR, `${lang}.json`);
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};

  const keys = Object.keys(en);
  console.log(`\n[${lang}] ${keys.length} -> ${to}`);

  let i = 0;
  for (const key of keys) {
    if (existing[key] && process.env.SKIP_EXISTING === '1') {
      i++;
      continue;
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        existing[key] = await translateOne(en[key], to);
        break;
      } catch (err) {
        console.warn(`  ${key} retry ${attempt + 1}: ${err.message}`);
        await sleep(2000 * (attempt + 1));
      }
    }
    i++;
    if (i % 20 === 0 || i === keys.length) {
      console.log(`  ${i}/${keys.length}`);
      fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    }
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log(`[${lang}] done`);
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const langs = process.argv.slice(2).filter((l) => l in TARGETS);
  const toRun = langs.length ? langs : Object.keys(TARGETS);
  for (const lang of toRun) {
    await translateLang(lang, en);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
