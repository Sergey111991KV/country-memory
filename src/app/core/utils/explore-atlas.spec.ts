import {
  ATLAS_CONTINENT_FILTERS,
  atlasContinentDot,
  filterAtlasRowsByQueryAndContinent,
  formatSharePercent,
  normalizeAtlasFocusIso,
  populationSharePercent,
} from './explore-atlas';

describe('explore-atlas helpers', () => {
  it('computes population share of world total', () => {
    expect(populationSharePercent(1_400_000_000, 8_000_000_000)).toBeCloseTo(
      17.5,
      5,
    );
    expect(populationSharePercent(0, 8_000_000_000)).toBe(0);
    expect(populationSharePercent(100, 0)).toBe(0);
  });

  it('formats share percentages for the list', () => {
    expect(formatSharePercent(18.25)).toBe('18.3');
    expect(formatSharePercent(1.04)).toBe('1.0');
    expect(formatSharePercent(0.42)).toBe('0.42');
    expect(formatSharePercent(0.05)).toBe('<0.1');
    expect(formatSharePercent(0)).toBe('0');
  });

  it('returns a continent dot color', () => {
    expect(atlasContinentDot('europe')).toMatch(/^#[0-9a-f]{6}$/i);
    expect(atlasContinentDot('other')).toBe('#94a3b8');
  });

  it('normalizes focus ISO query values', () => {
    expect(normalizeAtlasFocusIso(' fr ')).toBe('FR');
    expect(normalizeAtlasFocusIso('FRA')).toBe('');
    expect(normalizeAtlasFocusIso('')).toBe('');
    expect(normalizeAtlasFocusIso(null)).toBe('');
  });

  it('filters rows by continent and search (name or iso)', () => {
    const rows = [
      { name: 'France', country: { continent: 'europe' as const, iso2: 'FR' } },
      { name: 'Japan', country: { continent: 'asia' as const, iso2: 'JP' } },
      { name: 'Brazil', country: { continent: 'americas' as const, iso2: 'BR' } },
    ];
    expect(filterAtlasRowsByQueryAndContinent(rows, '', 'europe').map((r) => r.name)).toEqual([
      'France',
    ]);
    expect(filterAtlasRowsByQueryAndContinent(rows, 'jp', null).map((r) => r.name)).toEqual([
      'Japan',
    ]);
    expect(filterAtlasRowsByQueryAndContinent(rows, 'bra', 'asia')).toEqual([]);
    expect(ATLAS_CONTINENT_FILTERS).toContain('europe');
  });
});
