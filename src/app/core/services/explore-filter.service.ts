import { Injectable, inject } from '@angular/core';

import type { ExploreFilterId } from '../data/explore-filters';
import { EXPLORE_TOP_N } from '../data/explore-filters';
import type { Country } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { PlayPoolService } from './play-pool.service';

const SPANISH_LANG = /spanish|español|castellano/i;

@Injectable({ providedIn: 'root' })
export class ExploreFilterService {
  private readonly catalog = inject(CountriesCatalogService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly playPool = inject(PlayPoolService);

  async getMatchingCountries(filterId: ExploreFilterId): Promise<Country[]> {
    await this.catalog.ensureLoaded();
    await this.knowledge.ensureLoaded();
    const pool = await this.playPool.poolForTier();
    const playableIso = new Set(pool.map((c) => c.iso2.toUpperCase()));
    const isos = await this.matchingIsos(filterId);
    return isos
      .filter((iso) => playableIso.has(iso))
      .map((iso) => this.catalog.getByIso(iso))
      .filter((c): c is Country => Boolean(c));
  }

  async matchingIsos(filterId: ExploreFilterId): Promise<string[]> {
    await this.catalog.ensureLoaded();
    await this.knowledge.ensureLoaded();
    const all = this.catalog.getAll();

    switch (filterId) {
      case 'lang_spanish':
        return all
          .filter((c) => {
            const langs = this.knowledge.getEntry(c.iso2)?.languages ?? [];
            return langs.some((l) => SPANISH_LANG.test(l));
          })
          .map((c) => c.iso2.toUpperCase());
      case 'currency_euro':
        return all
          .filter((c) => this.knowledge.getEntry(c.iso2)?.currencyCode === 'EUR')
          .map((c) => c.iso2.toUpperCase());
      case 'top_population':
        return this.topByMetric(all, (iso) => this.knowledge.getEntry(iso)?.population ?? 0);
      case 'top_area':
        return this.topByMetric(all, (iso) => this.knowledge.getEntry(iso)?.areaKm2 ?? 0);
      case 'top_gdp':
        return this.topByGdp(all);
      default:
        return [];
    }
  }

  private topByMetric(
    countries: Country[],
    value: (iso: string) => number,
  ): string[] {
    return [...countries]
      .sort((a, b) => value(b.iso2) - value(a.iso2))
      .slice(0, EXPLORE_TOP_N)
      .map((c) => c.iso2.toUpperCase());
  }

  private topByGdp(countries: Country[]): string[] {
    return [...countries]
      .filter((c) => (this.knowledge.getEntry(c.iso2)?.gdpUsd ?? 0) > 0)
      .sort(
        (a, b) =>
          (this.knowledge.getEntry(b.iso2)?.gdpUsd ?? 0) -
          (this.knowledge.getEntry(a.iso2)?.gdpUsd ?? 0),
      )
      .slice(0, EXPLORE_TOP_N)
      .map((c) => c.iso2.toUpperCase());
  }
}
