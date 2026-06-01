/**
 * Shared machine-translation helpers (Google + MyMemory fallback).
 */
import { translate } from '@vitalets/google-translate-api';

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

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

export const APP_LANGS = Object.keys(TARGETS);

export function myMemoryCode(lang) {
  return TARGETS[lang] ?? lang;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function shieldForTranslation(text) {
  const tokens = [];
  let shielded = String(text).replace(PLACEHOLDER_RE, (match) => {
    const token = `⟦PH${tokens.length}⟧`;
    tokens.push(match);
    return token;
  });
  shielded = shielded.replaceAll('/', '⟦SLASH⟧');
  return { shielded, tokens };
}

export function restoreFromTranslation(text, tokens) {
  let out = text.replaceAll('⟦SLASH⟧', '/');
  for (let i = 0; i < tokens.length; i++) {
    out = out.replaceAll(`⟦PH${i}⟧`, tokens[i]);
    out = out.replaceAll(`__PH_${i}__`, tokens[i]);
  }
  return out;
}

export function needsTranslation(loc, lang, enText) {
  if (lang === 'en') {
    return false;
  }
  const cur = loc?.[lang];
  if (!cur || cur.trim() === '') {
    return true;
  }
  if (process.env.SKIP_EXISTING === '1' && cur !== enText) {
    return false;
  }
  if (process.env.SKIP_EXISTING === '1' && cur === enText && lang !== 'en') {
    return true;
  }
  return process.env.SKIP_EXISTING !== '1';
}

function isRateLimited(err) {
  const msg = String(err?.message ?? err);
  return (
    msg.includes('Too Many Requests') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

export async function translateViaGoogle(text, lang, depth = 0) {
  if (depth > 4) {
    throw new Error('Google rate limit retries exhausted');
  }
  const to = myMemoryCode(lang);
  try {
    const { text: out } = await translate(text, { from: 'en', to });
    return out.trim();
  } catch (err) {
    if (isRateLimited(err)) {
      const wait = Number(process.env.RATE_LIMIT_WAIT_MS ?? 90_000);
      console.warn(`  Google rate limited — waiting ${wait / 1000}s`);
      await sleep(wait);
      return translateViaGoogle(text, lang, depth + 1);
    }
    throw err;
  }
}

export async function translateViaMyMemory(text, lang, depth = 0) {
  if (depth > 4) {
    throw new Error('MyMemory rate limit retries exhausted');
  }
  const target = myMemoryCode(lang);
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `en|${target}`);

  const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (res.status === 429) {
    const wait = Number(process.env.RATE_LIMIT_WAIT_MS ?? 60_000);
    console.warn(`  rate limited — waiting ${wait / 1000}s`);
    await sleep(wait);
    return translateViaMyMemory(text, lang, depth + 1);
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

export async function translateEnTo(lang, enText) {
  const { shielded, tokens } = shieldForTranslation(enText);
  const providers = [
    () => translateViaGoogle(shielded, lang),
    () => translateViaMyMemory(shielded, lang),
  ];
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const run of providers) {
      try {
        const raw = await run();
        return restoreFromTranslation(raw, tokens);
      } catch (err) {
        console.warn(`  ${attempt + 1}: ${err.message}`);
      }
    }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`All providers failed for ${lang}`);
}
