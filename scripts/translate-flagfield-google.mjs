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
const RATE_LIMIT_WAIT_MS = Number(process.env.RATE_LIMIT_WAIT_MS ?? 90_000);
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shieldForTranslation(text) {
  const tokens = [];
  const shielded = text.replace(PLACEHOLDER_RE, (match) => {
    const token = `⟦PH${tokens.length}⟧`;
    tokens.push(match);
    return token;
  });
  return { shielded, tokens };
}

function restoreFromTranslation(text, tokens) {
  let out = text;
  for (let i = 0; i < tokens.length; i++) {
    out = out.replaceAll(`⟦PH${i}⟧`, tokens[i]);
    out = out.replaceAll(`__PH_${i}__`, tokens[i]);
  }
  return out;
}

function isRateLimited(err) {
  const msg = String(err?.message ?? err);
  return (
    msg.includes('Too Many Requests') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

async function translateViaMyMemory(text, target) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `en|${target}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (res.status === 429) {
    await sleep(60_000);
    return translateViaMyMemory(text, target);
  }
  if (!res.ok) {
    throw new Error(`MyMemory HTTP ${res.status}`);
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

async function translateOne(text, to, depth = 0) {
  if (depth > 4) {
    throw new Error('Rate limit retries exhausted');
  }
  try {
    const { text: out } = await translate(text, { from: 'en', to });
    return out;
  } catch (err) {
    if (isRateLimited(err)) {
      if (depth === 0) {
        try {
          console.warn('  Google rate limited — trying MyMemory');
          return await translateViaMyMemory(text, to);
        } catch (mmErr) {
          console.warn(`  MyMemory fallback failed: ${mmErr.message}`);
        }
      }
      console.warn(`  rate limited — waiting ${RATE_LIMIT_WAIT_MS / 1000}s`);
      await sleep(RATE_LIMIT_WAIT_MS);
      return translateOne(text, to, depth + 1);
    }
    throw err;
  }
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
    const { shielded, tokens } = shieldForTranslation(en[key]);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const raw = await translateOne(shielded, to);
        existing[key] = restoreFromTranslation(raw, tokens);
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
