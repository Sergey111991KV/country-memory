#!/usr/bin/env node
/**
 * Fills country names and capitals in src/assets/data/countries.json
 * using i18n-iso-countries (names) and Wikidata SPARQL (capitals).
 *
 * Run: node scripts/localize-countries.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const countries = require('i18n-iso-countries');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const countriesPath = join(root, 'src/assets/data/countries.json');
const cacheDir = join(__dirname, 'data/wikidata-capitals');

/** App UI language codes (see AppLang in messages.ts). */
const APP_LANGS = [
  'en',
  'ru',
  'es',
  'de',
  'fr',
  'uk',
  'zh',
  'hi',
  'ar',
  'pt',
  'ja',
  'ko',
  'it',
  'tr',
  'vi',
  'id',
  'pl',
  'nl',
  'bn',
  'ur',
];

const WIKIDATA_LANG = {
  en: 'en',
  ru: 'ru',
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function registerIsoLocales() {
  for (const lang of APP_LANGS) {
    if (lang === 'en') {
      continue;
    }
    countries.registerLocale(
      require(`i18n-iso-countries/langs/${lang}.json`),
    );
  }
}

function localizedCountryName(iso2, lang) {
  const code = iso2.toUpperCase();
  if (lang === 'en') {
    return (
      countries.getName(code, 'en', { select: 'alias' }) ??
      countries.getName(code, 'en', { select: 'official' })
    );
  }
  const alias = countries.getName(code, lang, { select: 'alias' });
  const official = countries.getName(code, lang, { select: 'official' });
  return alias ?? official ?? null;
}

async function fetchWikidataCapitals(wdLang) {
  const cachePath = join(cacheDir, `${wdLang}.json`);
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }

  const query = `
SELECT ?iso ?label WHERE {
  ?country wdt:P31/wdt:P279* wd:Q6256;
          wdt:P297 ?iso;
          wdt:P36 ?capital.
  ?capital rdfs:label ?label.
  FILTER(LANG(?label) = "${wdLang}")
}`.trim();

  const url =
    'https://query.wikidata.org/sparql?format=json&query=' +
    encodeURIComponent(query);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'FlagfieldLocalize/1.0 (github.com/sergejkosilov/countries)',
        },
        signal: AbortSignal.timeout(120_000),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Wikidata HTTP ${res.status}: ${text.slice(0, 120)}`);
      }
      const body = JSON.parse(text);
      const map = {};
      for (const row of body.results?.bindings ?? []) {
        map[row.iso.value] = row.label.value;
      }
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cachePath, JSON.stringify(map, null, 2));
      return map;
    } catch (err) {
      console.warn(`  Wikidata ${wdLang} attempt ${attempt + 1}: ${err.message}`);
      await sleep(4000 * (attempt + 1));
    }
  }
  return {};
}

async function main() {
  registerIsoLocales();

  const file = JSON.parse(readFileSync(countriesPath, 'utf8'));
  const capitalByLang = {};

  console.log('Fetching capital labels from Wikidata…');
  for (const lang of APP_LANGS) {
    if (lang === 'en') {
      continue;
    }
    const wdLang = WIKIDATA_LANG[lang];
    process.stdout.write(`  ${lang}… `);
    capitalByLang[lang] = await fetchWikidataCapitals(wdLang);
    console.log(Object.keys(capitalByLang[lang]).length, 'entries');
    await sleep(1500);
  }

  let namesFilled = 0;
  let capitalsFilled = 0;

  for (const country of file.countries) {
    const iso2 = country.iso2.toUpperCase();
    const names = { en: country.names?.en ?? iso2 };
    const capitals = { en: country.capitals?.en ?? '' };

    for (const lang of APP_LANGS) {
      if (lang === 'en') {
        continue;
      }
      const name = localizedCountryName(iso2, lang);
      if (name) {
        names[lang] = name;
        namesFilled++;
      } else {
        names[lang] = names.en;
      }

      const cap = capitalByLang[lang]?.[iso2];
      if (cap) {
        capitals[lang] = cap;
        capitalsFilled++;
      } else {
        capitals[lang] = capitals.en;
      }
    }

    country.names = names;
    country.capitals = capitals;
  }

  writeFileSync(countriesPath, JSON.stringify(file) + '\n');
  console.log(
    `\nUpdated ${file.countries.length} countries in ${countriesPath}`,
  );
  console.log(`Name slots filled from i18n-iso-countries: ${namesFilled}`);
  console.log(`Capital slots filled from Wikidata: ${capitalsFilled}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
