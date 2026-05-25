#!/usr/bin/env node
/**
 * Builds assets/data/country-knowledge.json from countries.json + REST Countries API.
 * Mixes friendly core facts with curated + generated trivia.
 * Run: node scripts/enrich-country-knowledge.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_TRIVIA } from './country-trivia-curated.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const countriesPath = join(root, 'src/assets/data/countries.json');
const outPath = join(root, 'src/assets/data/country-knowledge.json');

const TRIVIA_SLOTS = 4;

function loc(en, ru = en) {
  return { en, ru };
}

function fmtPopulation(n) {
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)} billion`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} million`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)} thousand`;
  }
  return String(n);
}

function fmtPopulationRu(n) {
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} млн`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)} тыс.`;
  }
  return String(n);
}

function fmtArea(km2) {
  if (km2 >= 1_000_000) {
    return `${(km2 / 1_000_000).toFixed(2)} million km²`;
  }
  return `${Math.round(km2).toLocaleString('en-US')} km²`;
}

function fmtAreaRu(km2) {
  if (km2 >= 1_000_000) {
    return `${(km2 / 1_000_000).toFixed(2)} млн км²`;
  }
  return `${Math.round(km2).toLocaleString('ru-RU')} км²`;
}

function pickCuratedTrivia(iso) {
  return [...(CURATED_TRIVIA[iso] ?? [])];
}

function generateAutoTrivia(catalog, api) {
  const nameEn = catalog.names.en;
  const nameRu = catalog.names.ru ?? nameEn;
  const population = api?.population ?? 0;
  const areaKm2 = api?.area ?? 0;
  const borderCount = api?.borders?.length ?? 0;
  const driveSide = api?.car?.side ?? 'right';
  const langs = api?.languages ? Object.values(api.languages) : [];
  const out = [];

  if (borderCount === 0) {
    out.push(
      loc(
        `${nameEn} has no land borders — pack sunscreen, not a border stamp.`,
        `У ${nameRu} нет сухопутных границ — берите крем от солнца, а не штамп в паспорте.`,
      ),
    );
  } else if (borderCount >= 5) {
    out.push(
      loc(
        `${nameEn} touches ${borderCount} neighbors — road trips can switch languages fast.`,
        `${nameRu} граничит с ${borderCount} странами — в дороге языки меняются быстро.`,
      ),
    );
  }

  if (population >= 100_000_000) {
    out.push(
      loc(
        `More than ${fmtPopulation(population)} people call ${nameEn} home — rush hour is an art form.`,
        `В ${nameRu} живут больше ${fmtPopulationRu(population)} человек — час пик — отдельное искусство.`,
      ),
    );
  } else if (population > 0 && population < 500_000) {
    out.push(
      loc(
        `${nameEn} is cozy on a global scale — under ${fmtPopulation(population)} people.`,
        `${nameRu} по мировым меркам компактная — меньше ${fmtPopulationRu(population)} жителей.`,
      ),
    );
  }

  if (areaKm2 > 0 && areaKm2 < 500) {
    out.push(
      loc(
        `On a map, ${nameEn} is tiny (${fmtArea(areaKm2)}) — you could walk across some corners in a day.`,
        `${nameRu} на карте крошечная (${fmtAreaRu(areaKm2)}) — некоторые уголки можно пройти за день.`,
      ),
    );
  }

  if (driveSide === 'left') {
    out.push(
      loc(
        `Drivers sit on the right side of the car in ${nameEn} — tourists, check twice before crossing.`,
        `В ${nameRu} руль справа — туристы, перепроверяйте перед переходом дороги.`,
      ),
    );
  }

  if (langs.length >= 3) {
    out.push(
      loc(
        `${nameEn} is a language buffet: ${langs.slice(0, 4).join(', ')}${langs.length > 4 ? '…' : ''}.`,
        `${nameRu} — языковой микс: ${langs.slice(0, 4).join(', ')}${langs.length > 4 ? '…' : ''}.`,
      ),
    );
  }

  if (catalog.continent === 'oceania' && borderCount === 0) {
    out.push(
      loc(
        `Island life in ${nameEn} means seafood stories and very long ferry rides between dots on the map.`,
        `Островная жизнь в ${nameRu} — истории про морепродукты и долгие паромы между точками на карте.`,
      ),
    );
  }

  return out;
}

function buildTriviaFacts(iso, catalog, api) {
  const curated = pickCuratedTrivia(iso);
  const auto = generateAutoTrivia(catalog, api);
  const pool = [];
  const seen = new Set();

  for (const item of [...curated, ...auto]) {
    const key = item.en;
    if (seen.has(key) || pool.length >= TRIVIA_SLOTS) {
      continue;
    }
    seen.add(key);
    pool.push(item);
  }

  while (pool.length < TRIVIA_SLOTS) {
    const nameEn = catalog.names.en;
    const nameRu = catalog.names.ru ?? nameEn;
    const filler = loc(
      `Every country has a story — ${nameEn} is worth more than one textbook paragraph.`,
      `У каждой страны своя история — ${nameRu} заслуживает больше одного абзаца в учебнике.`,
    );
    if (seen.has(filler.en)) {
      break;
    }
    seen.add(filler.en);
    pool.push(filler);
  }

  return pool.map((text, index) => ({
    id: `${iso}-trivia-${index + 1}`,
    category: 'trivia',
    text,
  }));
}

function buildFacts(catalog, api) {
  const iso = catalog.iso2.toUpperCase();
  const langs = api?.languages ? Object.values(api.languages).join(', ') : '—';
  const curKey = api?.currencies ? Object.keys(api.currencies)[0] : null;
  const cur = curKey && api.currencies[curKey] ? api.currencies[curKey] : null;
  const currencyCode = curKey ?? '—';
  const currencyNameEn = cur?.name ?? currencyCode;
  const population = api?.population ?? 0;
  const areaKm2 = api?.area ?? 0;

  const triviaFacts = buildTriviaFacts(iso, catalog, api);
  const facts = triviaFacts;

  return {
    iso2: iso,
    languages: langs.split(',').map((s) => s.trim()).filter(Boolean),
    currencyCode,
    currencyName: loc(currencyNameEn, currencyNameEn),
    population,
    areaKm2,
    subregion: loc(api?.subregion ?? api?.region ?? '—', api?.subregion ?? api?.region ?? '—'),
    facts,
  };
}

async function main() {
  const catalog = JSON.parse(readFileSync(countriesPath, 'utf8'));
  const fields =
    'cca2,population,area,languages,currencies,borders,car,subregion,region';
  const res = await fetch(`https://restcountries.com/v3.1/all?fields=${fields}`);
  if (!res.ok) {
    throw new Error(`REST Countries failed: ${res.status}`);
  }
  const all = await res.json();
  const byIso = new Map();
  for (const row of all) {
    const iso = row.cca2?.toUpperCase();
    if (iso) {
      byIso.set(iso, row);
    }
  }

  const countries = {};
  let factTotal = 0;
  let curatedCountries = 0;
  for (const c of catalog.countries) {
    const iso = c.iso2.toUpperCase();
    if (CURATED_TRIVIA[iso]?.length) {
      curatedCountries += 1;
    }
    const entry = buildFacts(c, byIso.get(iso));
    countries[iso] = entry;
    factTotal += entry.facts.length;
  }

  const out = {
    version: 2,
    generatedAt: new Date().toISOString(),
    factCountPerCountry: TRIVIA_SLOTS,
    countries,
  };

  writeFileSync(outPath, JSON.stringify(out));
  console.log(
    `Wrote ${outPath} — ${catalog.countries.length} countries, ${factTotal} facts, ${curatedCountries} with curated trivia`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
