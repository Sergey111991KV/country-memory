#!/usr/bin/env node
/**
 * Translate flagfield en.json -> locales via public Lingva Translate API.
 * Usage: node scripts/translate-flagfield-lingva.mjs fr de zh ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const EN_PATH = path.join(JSON_DIR, 'en.json');

const MIRRORS = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud',
  'https://lingva.garudalinux.org',
];

let mirrorCursor = 0;

const TARGETS = {
  es: 'es',
  de: 'de',
  fr: 'fr',
  uk: 'uk',
  zh: 'zh',
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

const DELAY_MS = Number(process.env.DELAY_MS ?? 900);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS ?? 25_000);

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Shield tokens that break Lingva path routing or return 404. */
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
  let out = text.replaceAll('⟦SLASH⟧', '/').replaceAll('⟦ SLASH ⟧', '/');
  for (let i = 0; i < tokens.length; i++) {
    out = out.replaceAll(`⟦PH${i}⟧`, tokens[i]);
    out = out.replaceAll(`⟦ PH${i} ⟧`, tokens[i]);
    out = out.replaceAll(`__PH_${i}__`, tokens[i]);
  }
  return out;
}

async function translateViaLingva(text, target, mirrorIndex) {
  const base = MIRRORS[mirrorIndex % MIRRORS.length];
  const url = `${base}/api/v1/en/${target}/${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${base}`);
  }
  const body = await res.json();
  if (body.error) {
    throw new Error(String(body.error));
  }
  const out = body.translation ?? body.result ?? text;
  if (typeof out !== 'string' || out.includes('MYMEMORY WARNING')) {
    throw new Error(`Bad translation: ${String(out).slice(0, 80)}`);
  }
  return out.trim();
}

async function translateViaMyMemory(text, target) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `en|${target}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 429) {
    await sleep(60_000);
    return translateViaMyMemory(text, target);
  }
  if (!res.ok) {
    throw new Error(`MyMemory HTTP ${res.status}`);
  }
  const body = await res.json();
  if (body.quotaFinished) {
    throw new Error('MyMemory quota finished');
  }
  return (body.responseData?.translatedText ?? text).trim();
}

async function translateOne(text, target) {
  const errors = [];
  for (let i = 0; i < MIRRORS.length; i++) {
    const idx = (mirrorCursor + i) % MIRRORS.length;
    try {
      const out = await translateViaLingva(text, target, idx);
      mirrorCursor = (idx + 1) % MIRRORS.length;
      return out;
    } catch (err) {
      errors.push(err.message);
    }
  }
  try {
    return await translateViaMyMemory(text, target);
  } catch (err) {
    errors.push(err.message);
    throw new Error(errors.join(' | '));
  }
}

async function translateLang(lang, en) {
  const target = TARGETS[lang];
  const outPath = path.join(JSON_DIR, `${lang}.json`);
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};

  const keys = Object.keys(en).filter((k) => {
    if (process.env.SKIP_EXISTING !== '1') {
      return true;
    }
    const cur = existing[k];
    return !cur || cur === en[k];
  });

  console.log(`\n[${lang}] ${keys.length} strings -> ${target}`);

  let i = 0;
  for (const key of keys) {
    const { shielded, tokens } = shieldForTranslation(en[key]);
    let value = shielded;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        value = await translateOne(shielded, target);
        break;
      } catch (err) {
        console.warn(`  ${key} retry ${attempt + 1}: ${err.message}`);
        await sleep(2000 * (attempt + 1));
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
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const langs = process.argv.slice(2).filter((l) => l in TARGETS);
  const toRun = langs.length ? langs : Object.keys(TARGETS).filter((l) => l !== 'es' && l !== 'uk');

  for (const lang of toRun) {
    await translateLang(lang, en);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
