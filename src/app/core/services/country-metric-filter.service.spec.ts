import { TestBed } from '@angular/core/testing';

import type { Country } from '../data/country.types';
import { CountryMetricFilterService } from './country-metric-filter.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { StorageService } from './storage.service';

const POOL: Country[] = [
  {
    id: 'cn',
    iso2: 'CN',
    names: { en: 'China' },
    capitals: { en: 'Beijing' },
    continent: 'asia',
    lat: 0,
    lng: 0,
  },
  {
    id: 'us',
    iso2: 'US',
    names: { en: 'United States' },
    capitals: { en: 'Washington' },
    continent: 'americas',
    lat: 0,
    lng: 0,
  },
  {
    id: 'ng',
    iso2: 'NG',
    names: { en: 'Nigeria' },
    capitals: { en: 'Abuja' },
    continent: 'africa',
    lat: 0,
    lng: 0,
  },
  {
    id: 'fr',
    iso2: 'FR',
    names: { en: 'France' },
    capitals: { en: 'Paris' },
    continent: 'europe',
    lat: 0,
    lng: 0,
  },
];

describe('CountryMetricFilterService', () => {
  let service: CountryMetricFilterService;
  let storage: StorageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        CountryMetricFilterService,
        {
          provide: CountryKnowledgeService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getEntry: (iso: string) => {
              const map: Record<string, { population: number; areaKm2: number; gdpUsd: number }> = {
                CN: { population: 1400, areaKm2: 9000, gdpUsd: 18000 },
                US: { population: 340, areaKm2: 9000, gdpUsd: 28000 },
                NG: { population: 220, areaKm2: 900, gdpUsd: 500 },
                FR: { population: 68, areaKm2: 640, gdpUsd: 3000 },
              };
              return map[iso.toUpperCase()];
            },
          },
        },
        StorageService,
      ],
    });
    service = TestBed.inject(CountryMetricFilterService);
    storage = TestBed.inject(StorageService);
    await storage.remove('flagfield_country_metric_filters_v1');
    await service.resetFilters();
  });

  it('returns all countries when filters are default', async () => {
    const result = await service.apply(POOL);
    expect(result.length).toBe(4);
  });

  it('filters by top population', async () => {
    await service.setFilters({ population: 'top15', area: 'any', gdp: 'any' });
    const result = await service.apply(POOL);
    expect(result.map((c) => c.iso2)).toEqual(['CN', 'US', 'NG', 'FR']);
  });

  it('combines population and gdp filters with AND logic', async () => {
    await service.setFilters({ population: 'large', area: 'any', gdp: 'large' });
    const result = await service.apply(POOL);
    expect(result.map((c) => c.iso2)).toEqual(['US']);
  });
});
