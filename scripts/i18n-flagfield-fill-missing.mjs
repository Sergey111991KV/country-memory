#!/usr/bin/env node
/**
 * Fill missing Flagfield UI keys + re-translate corrupted placeholder strings.
 * Uses Google Translate (MyMemory fallback). Preserves {{placeholders}} via ASCII shields.
 *
 * Usage:
 *   node scripts/i18n-flagfield-fill-missing.mjs           # all MT langs
 *   node scripts/i18n-flagfield-fill-missing.mjs es de fr  # subset
 *   FORCE_ALL=1 node scripts/i18n-flagfield-fill-missing.mjs ja
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translate } from '@vitalets/google-translate-api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const EN_PATH = path.join(JSON_DIR, 'en.json');

const TARGETS = {
  es: 'es',
  de: 'de',
  fr: 'fr',
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

const DELAY_MS = Number(process.env.DELAY_MS ?? 350);
const MYMEMORY_FIRST =
  process.env.MYMEMORY_FIRST === '1' || process.env.GOOGLE_DISABLED === '1';
let preferMyMemory = MYMEMORY_FIRST;
const PLACEHOLDER_RE = /\{\{\s*([\w.]+)\s*\}\}/g;
const STALE_AUTH_KEYS = [
  'auth.password',
  'auth.passwordConfirm',
  'auth.loginCta',
  'auth.registerCta',
  'auth.haveAccount',
  'auth.createAccount',
  'auth.logout',
  'auth.errorPasswordShort',
  'auth.errorPasswordMismatch',
  'auth.errorUserExists',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function placeholderNames(text) {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]).sort();
}

function shieldForTranslation(text) {
  const tokens = [];
  let shielded = text.replace(PLACEHOLDER_RE, (match) => {
    const token = `__PH${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  shielded = shielded.replaceAll('/', '__SLASH__');
  return { shielded, tokens };
}

function restoreFromTranslation(text, tokens) {
  let out = String(text ?? '');
  out = out.replaceAll('__SLASH__', '/');
  out = out.replace(/⟦\s*SLASH\s*⟧/gi, '/');
  out = out.replace(/⟦[^⟧]*(?:SLASH|BARRA|スラッシュ|슬래시|斜杠|UKOŚNIK|EĞİK|GARIS|GẠCH|سلیش|স্ল্যাশ|स्लैश)[^⟧]*⟧/gi, '/');

  for (let i = 0; i < tokens.length; i++) {
    const ph = tokens[i];
    const patterns = [
      new RegExp(`__PH\\s*${i}__`, 'gi'),
      new RegExp(`⟦\\s*PH\\s*${i}\\s*⟧`, 'gi'),
      new RegExp(`⟦\\s*PH${i}[^⟧]*⟧`, 'gi'),
      new RegExp(`\\[\\s*PH\\s*${i}\\s*\\]`, 'gi'),
    ];
    for (const re of patterns) {
      out = out.replace(re, ph);
    }
  }
  // leftover bracket artifacts
  out = out.replace(/⟦|⟧/g, '');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

function isCorrupt(value, enValue) {
  if (!value) return true;
  if (/⟦|⟧/.test(value)) return true;
  if (/__PH\d+__/.test(value)) return true;
  const enPh = placeholderNames(enValue).join(',');
  const locPh = placeholderNames(value).join(',');
  if (enPh && enPh !== locPh) return true;
  return false;
}

function keysNeedingWork(en, existing) {
  if (process.env.FORCE_ALL === '1') {
    return Object.keys(en);
  }
  return Object.keys(en).filter((key) => {
    const cur = existing[key];
    if (!cur) return true;
    if (cur === en[key]) return false;
    return isCorrupt(cur, en[key]);
  });
}

async function translateGoogle(text, target) {
  const res = await translate(text, { to: target, from: 'en' });
  return String(res.text ?? text).trim();
}

async function translateMyMemory(text, target) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `en|${target}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (res.status === 429) {
    await sleep(60_000);
    return translateMyMemory(text, target);
  }
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const body = await res.json();
  if (body.quotaFinished) throw new Error('MyMemory quota finished');
  const out = String(body.responseData?.translatedText ?? text).trim();
  if (out.includes('MYMEMORY WARNING')) throw new Error('MyMemory warning');
  return out;
}

async function translateOne(text, target) {
  if (preferMyMemory) {
    return translateMyMemory(text, target);
  }
  try {
    return await translateGoogle(text, target);
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (msg.includes('429') || msg.includes('Too Many Requests')) {
      preferMyMemory = true;
      console.warn('  Google rate limit — sticking to MyMemory');
      await sleep(2_000);
      return translateMyMemory(text, target);
    }
    console.warn(`  Google fail (${msg.slice(0, 80)}) — MyMemory`);
    return translateMyMemory(text, target);
  }
}

function scrubStale(existing) {
  let n = 0;
  for (const k of STALE_AUTH_KEYS) {
    if (k in existing) {
      delete existing[k];
      n++;
    }
  }
  return n;
}

async function fillLang(lang, en) {
  const target = TARGETS[lang];
  const outPath = path.join(JSON_DIR, `${lang}.json`);
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};

  const removed = scrubStale(existing);
  const keys = keysNeedingWork(en, existing);
  console.log(`\n[${lang}] ${keys.length} to translate (removed ${removed} stale auth keys)`);

  let i = 0;
  for (const key of keys) {
    const { shielded, tokens } = shieldForTranslation(en[key]);
    let raw = shielded;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        raw = await translateOne(shielded, target);
        break;
      } catch (err) {
        console.warn(`  ${key} retry ${attempt + 1}: ${err.message}`);
        await sleep(2000 * (attempt + 1));
      }
    }
    let value = restoreFromTranslation(raw, tokens);
    // If placeholders still wrong, keep EN for that key (better than broken UI)
    if (isCorrupt(value, en[key]) && placeholderNames(en[key]).length) {
      console.warn(`  ${key}: restore failed — keeping EN`);
      value = en[key];
    }
    existing[key] = value;
    i++;
    if (i % 15 === 0 || i === keys.length) {
      console.log(`  ${i}/${keys.length}`);
      fs.writeFileSync(outPath, JSON.stringify(existing, null, 2) + '\n');
    }
    await sleep(DELAY_MS);
  }

  // Drop keys not in EN
  for (const k of Object.keys(existing)) {
    if (!(k in en)) delete existing[k];
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2) + '\n');
  console.log(`[${lang}] saved ${Object.keys(existing).length} keys`);
}

async function main() {
  if (!fs.existsSync(EN_PATH)) {
    throw new Error('en.json missing — sync from en.ts first');
  }
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const args = process.argv.slice(2);
  const langs = args.length
    ? args.filter((l) => l in TARGETS)
    : Object.keys(TARGETS);

  for (const lang of langs) {
    await fillLang(lang, en);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
