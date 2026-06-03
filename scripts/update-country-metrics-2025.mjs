#!/usr/bin/env node
/**
 * Updates population, area, and GDP in country-knowledge.json from World Bank Open Data.
 * Prefers 2025 observations; falls back to 2024 when 2025 is not yet published.
 *
 * Run: node scripts/update-country-metrics-2025.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const knowledgePath = join(root, 'src/assets/data/country-knowledge.json');
const countriesPath = join(root, 'src/assets/data/countries.json');

const REFERENCE_YEAR = 2025;
const FALLBACK_YEARS = [2025, 2024, 2023];
const INDICATORS = {
  population: 'SP.POP.TOTL',
  areaKm2: 'AG.LND.TOTL.K2',
  gdpUsd: 'NY.GDP.MKTP.CD',
};

async function fetchIndicator(indicatorId) {
  const rows = [];
  let page = 1;
  let pages = 1;
  while (page <= pages) {
    const url =
      `https://api.worldbank.org/v2/country/all/indicator/${indicatorId}` +
      `?date=${FALLBACK_YEARS[0]}:${FALLBACK_YEARS[FALLBACK_YEARS.length - 1]}&format=json&per_page=5000&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`World Bank ${indicatorId} failed: ${res.status}`);
    }
    const json = await res.json();
    pages = json[0]?.pages ?? 1;
    rows.push(...(json[1] ?? []));
    page += 1;
  }
  return rows;
}

function pickYearValue(rows, iso3) {
  const byYear = new Map(
    rows
      .filter((row) => row.countryiso3code === iso3 && row.value != null)
      .map((row) => [Number(row.date), Number(row.value)]),
  );
  for (const year of FALLBACK_YEARS) {
    const value = byYear.get(year);
    if (value != null && Number.isFinite(value) && value > 0) {
      return { year, value };
    }
  }
  return null;
}

async function buildIso3Map() {
  const res = await fetch(
    'https://restcountries.com/v3.1/all?fields=cca2,cca3,cioc',
  );
  if (!res.ok) {
    throw new Error(`REST Countries iso map failed: ${res.status}`);
  }
  const all = await res.json();
  const iso2ToIso3 = new Map();
  for (const row of all) {
    const iso2 = row.cca2?.toUpperCase();
    const iso3 = row.cca3?.toUpperCase();
    if (iso2 && iso3) {
      iso2ToIso3.set(iso2, iso3);
    }
  }
  return iso2ToIso3;
}

async function main() {
  const catalog = JSON.parse(readFileSync(countriesPath, 'utf8'));
  const knowledge = JSON.parse(readFileSync(knowledgePath, 'utf8'));
  const iso2ToIso3 = await buildIso3Map();

  console.log('Fetching World Bank indicators…');
  const [populationRows, areaRows, gdpRows] = await Promise.all([
    fetchIndicator(INDICATORS.population),
    fetchIndicator(INDICATORS.areaKm2),
    fetchIndicator(INDICATORS.gdpUsd),
  ]);

  let updated = 0;
  let withGdp = 0;
  let year2025 = 0;

  for (const country of catalog.countries) {
    const iso2 = country.iso2.toUpperCase();
    const iso3 = iso2ToIso3.get(iso2);
    const entry = knowledge.countries[iso2];
    if (!entry || !iso3) {
      continue;
    }

    const population = pickYearValue(populationRows, iso3);
    const areaKm2 = pickYearValue(areaRows, iso3);
    const gdpUsd = pickYearValue(gdpRows, iso3);

    if (population) {
      entry.population = Math.round(population.value);
      entry.metricsPopulationYear = population.year;
    }
    if (areaKm2) {
      entry.areaKm2 = Math.round(areaKm2.value);
      entry.metricsAreaYear = areaKm2.year;
    }
    if (gdpUsd) {
      entry.gdpUsd = Math.round(gdpUsd.value);
      entry.metricsGdpYear = gdpUsd.year;
      withGdp += 1;
    }

    const years = [population?.year, areaKm2?.year, gdpUsd?.year].filter(Boolean);
    if (years.length) {
      entry.metricsYear = Math.max(...years);
      if (years.includes(REFERENCE_YEAR)) {
        year2025 += 1;
      }
      updated += 1;
    }
  }

  knowledge.metricsReferenceYear = REFERENCE_YEAR;
  knowledge.metricsSource = 'World Bank Open Data (data.worldbank.org)';
  knowledge.metricsUpdatedAt = new Date().toISOString();
  knowledge.version = 3;

  writeFileSync(knowledgePath, JSON.stringify(knowledge));
  console.log(
    `Updated ${updated} countries (${withGdp} with GDP, ${year2025} with ${REFERENCE_YEAR} observations) → ${knowledgePath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
