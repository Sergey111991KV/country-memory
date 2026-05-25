import { TestBed } from '@angular/core/testing';

import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { ExploreFilterService } from './explore-filter.service';
import { PlayPoolService } from './play-pool.service';
import {
  FIXTURE_COUNTRIES,
  FIXTURE_KNOWLEDGE,
} from '../../play/testing/play-test-fixtures';

describe('ExploreFilterService', () => {
  let service: ExploreFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExploreFilterService,
        {
          provide: CountriesCatalogService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getAll: () => FIXTURE_COUNTRIES,
            getByIso: (iso: string) =>
              FIXTURE_COUNTRIES.find((c) => c.iso2 === iso.toUpperCase()),
          },
        },
        {
          provide: CountryKnowledgeService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getEntry: (iso: string) => FIXTURE_KNOWLEDGE[iso.toUpperCase()],
          },
        },
        {
          provide: PlayPoolService,
          useValue: {
            poolForTier: () => Promise.resolve(FIXTURE_COUNTRIES),
          },
        },
      ],
    });
    service = TestBed.inject(ExploreFilterService);
  });

  it('matches Spanish-speaking countries', async () => {
    const isos = await service.matchingIsos('lang_spanish');
    expect(isos).toContain('ES');
    expect(isos).not.toContain('DE');
  });

  it('matches euro currency countries', async () => {
    const isos = await service.matchingIsos('currency_euro');
    expect(isos).toEqual(jasmine.arrayContaining(['ES', 'DE', 'FR']));
    expect(isos).not.toContain('NG');
  });

  it('returns top population slice', async () => {
    const isos = await service.matchingIsos('top_population');
    expect(isos[0]).toBe('CN');
    expect(isos.length).toBe(5);
  });

  it('returns top area slice', async () => {
    const isos = await service.matchingIsos('top_area');
    expect(isos[0]).toBe('CN');
  });

  it('getMatchingCountries respects tier pool', async () => {
    const countries = await service.getMatchingCountries('currency_euro');
    expect(countries.every((c) => c.iso2 === 'ES' || c.iso2 === 'DE' || c.iso2 === 'FR')).toBeTrue();
  });
});
