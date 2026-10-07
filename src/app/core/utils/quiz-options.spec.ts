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

  it('hard mode prefers look-alike flags; easy mode other continents', () => {
    const big = [
      country('ID', 'asia'),
      country('MC', 'europe'),
      country('PL', 'europe'),
      country('SG', 'asia'),
      country('FR', 'europe'),
      country('DE', 'europe'),
      country('IT', 'europe'),
      country('BR', 'americas'),
      country('KE', 'africa'),
      country('AU', 'oceania'),
    ];
    const hard = buildQuizChoices(big[0]!, big, (c) => c.names.en, {
      difficulty: 'hard',
      similar: ['MC', 'PL', 'SG'],
    }).map((c) => c.country.iso2);
    expect(new Set(hard)).toEqual(new Set(['ID', 'MC', 'PL', 'SG']));

    const easy = buildQuizChoices(big[4]!, big, (c) => c.names.en, { difficulty: 'easy' });
    expect(easy.filter((c) => c.country.continent === 'europe').length).toBe(1);
  });
});
