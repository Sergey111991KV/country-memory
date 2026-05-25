import type { Country } from '../data/country.types';
import { buildQuizChoices } from './quiz-options';

function country(iso2: string, continent: Country['continent']): Country {
  return {
    id: iso2,
    iso2,
    names: { en: iso2 },
    capitals: { en: 'Capital' },
    continent,
    lat: 0,
    lng: 0,
  };
}

describe('buildQuizChoices', () => {
  const pool = [
    country('EG', 'africa'),
    country('FR', 'europe'),
    country('DE', 'europe'),
    country('IT', 'europe'),
    country('JP', 'asia'),
  ];

  it('returns four unique choices including target', () => {
    const target = pool[0];
    const choices = buildQuizChoices(target, pool, (c) => c.names.en);
    expect(choices.length).toBe(4);
    const isos = choices.map((c) => c.country.iso2);
    expect(new Set(isos).size).toBe(4);
    expect(isos).toContain('EG');
  });
});
