import type { ContinentId } from '../data/country.types';

/** Solid swatches for list dots (aligned with classic globe continent fills). */
export const ATLAS_CONTINENT_DOT: Record<ContinentId, string> = {
  africa: '#d2b478',
  asia: '#78a882',
  europe: '#82aad2',
  oceania: '#aa96c8',
  americas: '#be9670',
  other: '#94a3b8',
};

/** Continent chips shown in the atlas panel (excludes rare `other`). */
export const ATLAS_CONTINENT_FILTERS: readonly ContinentId[] = [
  'africa',
  'asia',
  'europe',
  'americas',
  'oceania',
] as const;

/** Share of world population for Genotek-style list percentages. */
export function populationSharePercent(
  population: number,
  worldTotal: number,
): number {
  if (!worldTotal || population <= 0) {
    return 0;
  }
  return (population / worldTotal) * 100;
}

/** Compact display for atlas list (e.g. 18.2, 0.42, &lt;0.1). */
export function formatSharePercent(share: number): string {
  if (share <= 0) {
    return '0';
  }
  if (share < 0.1) {
    return '<0.1';
  }
  if (share < 1) {
    return share.toFixed(2);
  }
  return share.toFixed(1);
}

export function atlasContinentDot(continent: ContinentId): string {
  return ATLAS_CONTINENT_DOT[continent] ?? ATLAS_CONTINENT_DOT.other;
}

/** Normalize `?focus=` query to ISO-3166 alpha-2 or empty. */
export function normalizeAtlasFocusIso(raw: string | null | undefined): string {
  const iso = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(iso) ? iso : '';
}

export function filterAtlasRowsByQueryAndContinent<
  T extends { name: string; country: { continent: ContinentId; iso2: string } },
>(rows: readonly T[], query: string, continent: ContinentId | null): T[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (continent && row.country.continent !== continent) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(q) ||
      row.country.iso2.toLowerCase().includes(q)
    );
  });
}
