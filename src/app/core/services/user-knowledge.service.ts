import { Injectable, inject } from '@angular/core';

import type {
  Country,
  CountryMastery,
  FactCategory,
  KnowledgeCategoryStat,
  KnowledgeStats,
} from '../data/country.types';
import { CountryKnowledgeService } from './country-knowledge.service';
import { UserLearnedService } from './user-learned.service';

@Injectable({ providedIn: 'root' })
export class UserKnowledgeService {
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly userLearned = inject(UserLearnedService);

  private statsCache: { key: string; stats: KnowledgeStats } | null = null;

  async computeStats(
    playableCountries: Country[],
    _masteryList: CountryMastery[],
  ): Promise<KnowledgeStats> {
    await this.userLearned.hydrate();
    await this.knowledge.ensureLoaded();

    const cacheKey = `${this.userLearned.getMarksRevision()}:${playableCountries.length}`;
    if (this.statsCache?.key === cacheKey) {
      return this.statsCache.stats;
    }

    const totals = this.knowledge.getCatalogTotals(playableCountries);
    const learnedCountries = playableCountries.filter((c) =>
      this.userLearned.isCountryMarked(c.iso2),
    );

    const langSet = new Set<string>();
    const curSet = new Set<string>();
    const continentSet = new Set<string>();
    let capitalsLearned = 0;
    let populationsLearned = 0;
    let factsLearned = 0;

    for (const c of playableCountries) {
      const iso = c.iso2.toUpperCase();
      const entry = this.knowledge.getEntry(iso);
      if (!entry) {
        continue;
      }

      for (const fact of this.knowledge.getTriviaFacts(iso)) {
        if (!this.userLearned.isFactMarked(fact.id)) {
          continue;
        }
        factsLearned += 1;
      }

      if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'capital'))) {
        capitalsLearned += 1;
      }
      if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'population'))) {
        populationsLearned += 1;
      }
      if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'language'))) {
        for (const lang of entry.languages) {
          langSet.add(lang.toLowerCase());
        }
      }
      if (
        this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'currency')) &&
        entry.currencyCode !== '—'
      ) {
        curSet.add(entry.currencyCode);
      }
      if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'capital'))) {
        continentSet.add(c.continent);
      }
    }

    const stats: KnowledgeStats = {
      countriesLearned: learnedCountries.length,
      countriesTotal: playableCountries.length,
      factsLearned,
      factsTotal: totals.factsTotal,
      languagesLearned: langSet.size,
      languagesTotal: this.knowledge.getTotalUniqueLanguages(),
      currenciesLearned: curSet.size,
      currenciesTotal: this.knowledge.getTotalUniqueCurrencies(),
      continentsLearned: continentSet.size,
      continentsTotal: 5,
      capitalsLearned,
      capitalsTotal: totals.capitalsTotal,
      populationsLearned,
      populationsTotal: totals.populationsTotal,
      areasLearned: 0,
      areasTotal: 0,
      byCategory: [
        {
          id: 'trivia' as FactCategory,
          learned: factsLearned,
          total: totals.factsTotal,
        },
      ] satisfies KnowledgeCategoryStat[],
    };
    this.statsCache = { key: cacheKey, stats };
    return stats;
  }
}
