import { Injectable, inject } from '@angular/core';

import type { Country, CountryFact } from '../data/country.types';
import { FREE_TIER_COUNTRY_ISOS } from '../data/play-tier.constants';
import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { SubscriptionService } from './subscription.service';
import { UserLearnedService } from './user-learned.service';

@Injectable({ providedIn: 'root' })
export class PlayPoolService {
  private readonly catalog = inject(CountriesCatalogService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly learned = inject(UserLearnedService);
  private readonly sub = inject(SubscriptionService);

  private readonly freeIsoSet = new Set<string>(
    FREE_TIER_COUNTRY_ISOS.map((x) => x.toUpperCase()),
  );

  isPremium(): boolean {
    return this.sub.isSubscribed();
  }

  async getFreePool(): Promise<Country[]> {
    await this.catalog.ensureLoaded();
    return this.catalog
      .getAll()
      .filter((c) => this.freeIsoSet.has(c.iso2.toUpperCase()));
  }

  async getFullPool(): Promise<Country[]> {
    await this.catalog.ensureLoaded();
    return this.catalog.getAll();
  }

  async poolForTier(): Promise<Country[]> {
    return this.isPremium() ? this.getFullPool() : this.getFreePool();
  }

  async getLearnedCountries(): Promise<Country[]> {
    await this.catalog.ensureLoaded();
    await this.learned.hydrate();
    const isos = await this.learned.getLearnedCountryIsos();
    return this.catalog
      .getAll()
      .filter((c) => isos.has(c.iso2.toUpperCase()));
  }

  async hasLearnedContent(): Promise<boolean> {
    const countries = await this.getLearnedCountries();
    if (countries.length >= 2) {
      return true;
    }
    const facts = await this.getLearnedFacts();
    return facts.length >= 2;
  }

  /** Manually marked facts (for fact-only quiz). */
  async getFactQuizPool(): Promise<{ country: Country; fact: CountryFact }[]> {
    return this.getLearnedFacts();
  }

  async getLearnedFacts(): Promise<{ country: Country; fact: CountryFact }[]> {
    await this.catalog.ensureLoaded();
    await this.knowledge.ensureLoaded();
    await this.learned.hydrate();
    const out: { country: Country; fact: CountryFact }[] = [];
    for (const iso of await this.learned.getLearnedCountryIsos()) {
      const country = this.catalog.getByIso(iso);
      if (!country) {
        continue;
      }
      for (const factId of this.learned.getLearnedFactIdsForCountry(iso)) {
        const fact = this.knowledge
          .getTriviaFacts(iso)
          .find((f) => f.id === factId);
        if (fact) {
          out.push({ country, fact });
        }
      }
    }
    return out;
  }
}
