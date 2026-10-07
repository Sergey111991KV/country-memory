import { Injectable, inject } from '@angular/core';

import type { ContinentId } from '../data/country.types';
import {
  type AchievementStats,
  type AchievementView,
  LEARNED_BOX,
  computeAchievements,
  longestDayStreak,
} from '../utils/achievements';
import { ArcadeRecordsService } from './arcade-records.service';
import { CountriesCatalogService } from './countries-catalog.service';
import { DailyCountryService } from './daily-country.service';
import { UserLearningService } from './user-learning.service';

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly learning = inject(UserLearningService);
  private readonly catalog = inject(CountriesCatalogService);
  private readonly records = inject(ArcadeRecordsService);
  private readonly daily = inject(DailyCountryService);

  async stats(): Promise<AchievementStats> {
    await Promise.all([this.learning.hydrate(), this.catalog.ensureLoaded(), this.daily.refresh()]);
    const learned = new Set(this.learning.getLearnedIsos(LEARNED_BOX));
    const continents: AchievementStats['continents'] = {};
    for (const c of this.catalog.getAll()) {
      const id = c.continent as ContinentId;
      const row = (continents[id] ??= { learned: 0, total: 0 });
      row.total += 1;
      if (learned.has(c.iso2)) {
        row.learned += 1;
      }
    }
    const [flags, capitals] = await Promise.all([
      this.records.best('blitz_flags'),
      this.records.best('blitz_capitals'),
    ]);
    const streak = this.daily.streak();
    return {
      correctTotal: this.learning.getCorrectTotal(),
      longestStreakDays: longestDayStreak(this.learning.getActiveDayKeys()),
      learnedCountries: learned.size,
      continents,
      blitzBest: Math.max(flags, capitals),
      dailySolved: streak.solved,
      dailyBestStreak: streak.best,
      weakFixed: this.learning.getFixedWeakCount(LEARNED_BOX),
    };
  }

  async list(): Promise<AchievementView[]> {
    return computeAchievements(await this.stats());
  }
}
