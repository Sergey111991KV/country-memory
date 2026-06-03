/**
 * Shared machine-translation helpers (Google → Lingva → MyMemory).
 */
import { translate as translateVitalets } from '@vitalets/google-translate-api';
import translateGoogleX from 'google-translate-api-x';

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function lingvaMirrors() {
  const fromEnv = process.env.LINGVA_MIRRORS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv?.length
    ? fromEnv
    : [
        'https://lingva.ml',
        'https://translate.igna.wtf',
        'https://translate.plausibility.cloud',
        'https://lingva.lunar.icu',
        'https://translate.projectsegfau.lt',
        'https://translate.dr460nf1r3.org',
        'https://translate.jae.fi',
      ];
}

let lingvaMirrorCursor = 0;

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

export function isBadTranslation(text, source) {
  if (!text || text === source) {
    return true;
  }
  const upper = text.toUpperCase();
  return (
    upper.includes('MYMEMORY WARNING') ||
    upper.includes('IS AN INVALID TARGET LANGUAGE') ||
    upper.includes('QUERY LENGTH LIMIT')
  );
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

export async function translateViaLingva(text, lang) {
  const target = lang === 'zh' ? 'zh' : lang;
  const errors = [];
  const mirrors = lingvaMirrors();
  for (let i = 0; i < mirrors.length; i++) {
    const idx = (lingvaMirrorCursor + i) % mirrors.length;
    const base = mirrors[idx];
    const url = `${base}/api/v1/en/${target}/${encodeURIComponent(text)}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FlagfieldLocalize/1.0',
        },
        signal: AbortSignal.timeout(60_000),
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
      lingvaMirrorCursor = (idx + 1) % mirrors.length;
      return out.trim();
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(' | '));
}

export async function translateViaGoogle(text, lang, depth = 0) {
  if (depth > 4) {
    throw new Error('Google rate limit retries exhausted');
  }
  const to = myMemoryCode(lang);
  try {
    const result = await translateGoogleX(text, { from: 'en', to });
    const out = (result.text ?? result).trim();
    if (!out || isBadTranslation(out, text)) {
      throw new Error('Empty or invalid Google translation');
    }
    return out;
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

async function translateViaGoogleVitalets(text, lang, depth = 0) {
  if (depth > 2) {
    throw new Error('Google (vitalets) rate limit retries exhausted');
  }
  const to = myMemoryCode(lang);
  try {
    const { text: out } = await translateVitalets(text, { from: 'en', to });
    return out.trim();
  } catch (err) {
    if (isRateLimited(err)) {
      throw err;
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
  const body = await res.json().catch(() => ({}));
  if (res.status === 429 || body.quotaFinished) {
    const out = body.responseData?.translatedText ?? '';
    if (body.quotaFinished || String(out).includes('MYMEMORY WARNING')) {
      throw new Error('MyMemory daily quota finished');
    }
    const wait = Number(process.env.RATE_LIMIT_WAIT_MS ?? 60_000);
    console.warn(`  rate limited — waiting ${wait / 1000}s`);
    await sleep(wait);
    return translateViaMyMemory(text, lang, depth + 1);
  }
  if (!res.ok) {
    throw new Error(`MyMemory HTTP ${res.status}`);
  }
  if (body.quotaFinished) {
    throw new Error('MyMemory daily quota finished');
  }
  const out = (body.responseData?.translatedText ?? text).trim();
  if (isBadTranslation(out, text)) {
    throw new Error('MyMemory warning in response');
  }
  return out;
}

function skipMyMemory(err) {
  const msg = String(err?.message ?? err);
  return msg.includes('quota finished') || msg.includes('MYMEMORY WARNING');
}

function translationProviders(shielded, lang) {
  if (process.env.MT_MYMEMORY_ONLY === '1') {
    return [() => translateViaMyMemory(shielded, lang)];
  }
  if (process.env.MT_GOOGLE_ONLY === '1') {
    return [() => translateViaGoogle(shielded, lang)];
  }
  if (process.env.MT_LINGVA_ONLY === '1') {
    return [() => translateViaLingva(shielded, lang)];
  }
  return [
    () => translateViaGoogle(shielded, lang),
    () => translateViaLingva(shielded, lang),
    () => translateViaGoogleVitalets(shielded, lang),
    () => translateViaMyMemory(shielded, lang),
  ];
}

export async function translateEnTo(lang, enText) {
  const { shielded, tokens } = shieldForTranslation(enText);
  const providers = translationProviders(shielded, lang);
  for (let attempt = 0; attempt < 2; attempt++) {
    let skipMemory = false;
    for (const run of providers) {
      if (skipMemory && run === providers.at(-1)) {
        continue;
      }
      try {
        const raw = await run();
        return restoreFromTranslation(raw, tokens);
      } catch (err) {
        if (skipMyMemory(err)) {
          skipMemory = true;
        }
        console.warn(`  ${attempt + 1}: ${err.message}`);
      }
    }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`All providers failed for ${lang}`);
}
