import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import type { Country } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { CountryKnowledgeService } from '../../core/services/country-knowledge.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { GeoJsonCacheService } from '../../core/services/geo-json-cache.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import { type CountrySilhouette, countrySilhouette } from '../../core/utils/country-silhouette';
import { type GlobeCountryFeature, iso2FromNaturalEarth } from '../../core/utils/globe-geo';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';
import { buildQuizChoices, type QuizChoice } from '../../core/utils/quiz-options';

const ROUNDS = 10;
/** Outlines of micro-states are unrecognisable, skip them. */
const MIN_AREA_KM2 = 8_000;

@Component({
  selector: 'app-silhouette',
  templateUrl: './silhouette.page.html',
  styleUrls: ['./silhouette.page.scss'],
  standalone: false,
})
export class SilhouettePage implements ViewDidEnter {
  readonly locale = inject(LocaleService);
  readonly catalog = inject(CountriesCatalogService);
  private readonly router = inject(Router);
  private readonly geoCache = inject(GeoJsonCacheService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly playPool = inject(PlayPoolService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);

  loading = true;
  loadError = false;
  round = 1;
  readonly roundsTotal = ROUNDS;
  correct = 0;
  streak = 0;
  phase: 'pick' | 'feedback' = 'pick';
  target: Country | null = null;
  shape: CountrySilhouette | null = null;
  choices: QuizChoice[] = [];
  selectedIso: string | null = null;
  feedbackCorrect = false;

  private pool: Country[] = [];
  private features = new Map<string, GlobeCountryFeature>();
  private used = new Set<string>();
  private bootStarted = false;

  get targetLabel(): string {
    return this.target ? this.catalog.localizedName(this.target, this.locale.language) : '';
  }

  async ionViewDidEnter(): Promise<void> {
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    try {
      await Promise.all([this.catalog.ensureLoaded(), this.knowledge.ensureLoaded()]);
      const [all, base] = await Promise.all([
        this.geoCache.getPoliticalFeatures(),
        this.playPool.getFilteredFreePool(),
      ]);
      for (const f of all) {
        const iso = iso2FromNaturalEarth(f.properties);
        if (iso) {
          this.features.set(iso, f);
        }
      }
      this.pool = base.filter(
        (c) =>
          this.features.has(c.iso2) &&
          (this.knowledge.getEntry(c.iso2)?.areaKm2 ?? 0) >= MIN_AREA_KM2,
      );
      if (this.pool.length < 4) {
        this.pool = base.filter((c) => this.features.has(c.iso2));
      }
      if (this.pool.length < 4) {
        throw new Error('Not enough countries for silhouettes');
      }
      this.startRound();
    } catch (err) {
      console.error('Silhouette boot failed:', err);
      this.loadError = true;
    } finally {
      this.loading = false;
    }
  }

  async pick(choice: QuizChoice): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedIso = choice.country.iso2;
    this.feedbackCorrect = choice.country.iso2 === this.target.iso2;
    this.phase = 'feedback';
    if (this.feedbackCorrect) {
      this.correct += 1;
      this.streak += 1;
      await this.dailyGoal.bumpProgress();
    } else {
      this.streak = 0;
    }
    await this.learning.recordAttempt('quiz', this.target.iso2, this.feedbackCorrect, false);
  }

  choiceState(iso2: string): 'correct' | 'wrong' | 'default' {
    if (this.phase !== 'feedback') {
      return 'default';
    }
    if (iso2 === this.target?.iso2) {
      return 'correct';
    }
    return iso2 === this.selectedIso ? 'wrong' : 'default';
  }

  async next(): Promise<void> {
    if (this.round >= ROUNDS) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'play.silhouetteTitle',
          doneHeaderKey: 'quiz.sessionDone',
          correct: this.correct,
          total: ROUNDS,
          subtitleKey: 'play.silhouetteSub',
        }),
      );
      return;
    }
    this.round += 1;
    this.startRound();
  }

  openOnGlobe(): void {
    if (!this.target) {
      return;
    }
    void this.router.navigate(['/tabs/play/globe-find'], {
      queryParams: { focus: this.target.iso2 },
    });
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  private startRound(): void {
    const fresh = this.pool.filter((c) => !this.used.has(c.iso2));
    const source = fresh.length ? fresh : this.pool;
    const target = source[Math.floor(Math.random() * source.length)]!;
    this.used.add(target.iso2);
    this.target = target;
    this.shape = countrySilhouette(this.features.get(target.iso2)?.geometry);
    const lang = this.locale.language;
    this.choices = buildQuizChoices(target, this.pool, (c) => this.catalog.localizedName(c, lang));
    this.phase = 'pick';
    this.selectedIso = null;
    this.feedbackCorrect = false;
  }
}
