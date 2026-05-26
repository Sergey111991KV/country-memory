#!/usr/bin/env node
/**
 * Machine-translate Flagfield UI strings (en -> other locales) via MyMemory free API.
 * Preserves {{placeholders}}. Skips en/ru (ru.ts is hand-maintained).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const EN_PATH = path.join(JSON_DIR, 'en.json');

/** MyMemory target codes */
const TARGETS = {
  es: 'es',
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

const DELAY_MS = Number(process.env.DELAY_MS ?? 1200);
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shieldForTranslation(text) {
  const tokens = [];
  let shielded = text.replace(PLACEHOLDER_RE, (match) => {
    const token = `⟦PH${tokens.length}⟧`;
    tokens.push(match);
    return token;
  });
  shielded = shielded.replaceAll('/', '⟦SLASH⟧');
  return { shielded, tokens };
}

function restoreFromTranslation(text, tokens) {
  let out = text.replaceAll('⟦SLASH⟧', '/');
  for (let i = 0; i < tokens.length; i++) {
    out = out.replaceAll(`⟦PH${i}⟧`, tokens[i]);
    out = out.replaceAll(`__PH_${i}__`, tokens[i]);
  }
  return out;
}

function shouldTranslateKey(key, enValue, existing) {
  if (process.env.SKIP_EXISTING !== '1') {
    return true;
  }
  const cur = existing[key];
  return !cur || cur === enValue;
}

async function translateOne(text, target) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `en|${target}`);

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (res.status === 429) {
    const wait = 60_000;
    console.warn(`  rate limited — waiting ${wait / 1000}s`);
    await sleep(wait);
    return translateOne(text, target);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = await res.json();
  if (body.quotaFinished) {
    throw new Error('MyMemory daily quota finished');
  }
  const out = (body.responseData?.translatedText ?? text).trim();
  if (out.includes('MYMEMORY WARNING')) {
    throw new Error('MyMemory warning in response');
  }
  return out;
}

async function translateLang(lang, en, onlyKeys) {
  const target = TARGETS[lang];
  const outPath = path.join(JSON_DIR, `${lang}.json`);
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};

  const allKeys = Object.keys(en);
  const keys =
    onlyKeys ??
    allKeys.filter((k) => shouldTranslateKey(k, en[k], existing));

  console.log(`\n[${lang}] ${keys.length} strings -> ${target}`);

  let i = 0;
  for (const key of keys) {
    const { shielded, tokens } = shieldForTranslation(en[key]);
    let value = en[key];
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        value = await translateOne(shielded, target);
        break;
      } catch (err) {
        console.warn(`  ${key} retry ${attempt + 1}: ${err.message}`);
        await sleep(2500 * (attempt + 1));
      }
    }
    existing[key] = restoreFromTranslation(value, tokens);
    i++;
    if (i % 10 === 0 || i === keys.length) {
      console.log(`  ${i}/${keys.length}`);
      fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    }
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log(`[${lang}] saved ${outPath}`);
}

async function main() {
  if (!fs.existsSync(EN_PATH)) {
    const enTs = fs.readFileSync(
      path.join(__dirname, '../src/app/core/i18n/flagfield/en.ts'),
      'utf8',
    );
    const body = enTs
      .replace(/^export const FLAGFIELD_EN[^=]*=\s*/, '')
      .replace(/;\s*$/, '');
    const en = Function(`"use strict"; return (${body})`)();
    fs.mkdirSync(JSON_DIR, { recursive: true });
    fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2));
  }

  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const langs = process.argv.slice(2);
  const toRun = langs.length ? langs.filter((l) => l in TARGETS) : Object.keys(TARGETS);

  for (const lang of toRun) {
    await translateLang(lang, en);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
