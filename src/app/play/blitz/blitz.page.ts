import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewDidEnter, ViewWillLeave } from '@ionic/angular';

import type { Country } from '../../core/data/country.types';
import { ArcadeRecordsService } from '../../core/services/arcade-records.service';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import {
  BLITZ_DURATION_MS,
  BLITZ_WRONG_PENALTY_MS,
  blitzPoints,
  blitzRemainingMs,
} from '../../core/utils/blitz-scoring';
import { ensurePlaySessionAccess } from '../../core/utils/play-access';
import { buildQuizChoices } from '../../core/utils/quiz-options';
import type { BlitzMode } from '../play-mode.types';

type BlitzPhase = 'ready' | 'playing' | 'done';

interface BlitzChoice {
  key: string;
  label: string;
  correct: boolean;
}

const FLASH_MS = 320;
const TICK_MS = 100;

@Component({
  selector: 'app-blitz',
  templateUrl: './blitz.page.html',
  styleUrls: ['./blitz.page.scss'],
  standalone: false,
})
export class BlitzPage implements ViewDidEnter, ViewWillLeave, OnDestroy {
  readonly locale = inject(LocaleService);
  private readonly catalog = inject(CountriesCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly records = inject(ArcadeRecordsService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly subscription = inject(SubscriptionService);

  mode: BlitzMode = 'flags';
  phase: BlitzPhase = 'ready';
  loading = true;
  score = 0;
  streak = 0;
  correctCount = 0;
  answered = 0;
  best = 0;
  newRecord = false;
  remainingMs = BLITZ_DURATION_MS;
  target: Country | null = null;
  choices: BlitzChoice[] = [];
  /** Choice key flashed after an answer (green / red). */
  flashKey: string | null = null;
  flashCorrect = false;
  /** Brief "−3 s" pulse on the timer. */
  penaltyPulse = false;

  private pool: Country[] = [];
  private startedAt = 0;
  private penaltyMs = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private recentIsos: string[] = [];
  private locked = false;

  get title(): string {
    return this.mode === 'flags' ? 'play.blitzFlagsTitle' : 'play.blitzCapitalsTitle';
  }

  get secondsLeft(): number {
    return Math.ceil(this.remainingMs / 1000);
  }

  get timePercent(): number {
    return (this.remainingMs / BLITZ_DURATION_MS) * 100;
  }

  get recordId(): string {
    return `blitz_${this.mode}`;
  }

  get countryName(): string {
    return this.target ? this.catalog.localizedName(this.target, this.locale.language) : '';
  }

  async ionViewDidEnter(): Promise<void> {
    const mode = this.route.snapshot.paramMap.get('mode');
    this.mode = mode === 'capitals' ? 'capitals' : 'flags';
    await this.catalog.ensureLoaded();
    this.pool = await this.playPool.getFilteredFreePool();
    this.best = await this.records.best(this.recordId);
    this.loading = false;
  }

  ionViewWillLeave(): void {
    this.stopTimer();
    if (this.phase === 'playing') {
      this.phase = 'ready';
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  async start(): Promise<void> {
    if (this.pool.length < 4 || this.phase === 'playing') {
      return;
    }
    if (!(await ensurePlaySessionAccess(this.subscription, this.sessionAccess, this.router))) {
      return;
    }
    this.phase = 'playing';
    this.score = 0;
    this.streak = 0;
    this.correctCount = 0;
    this.answered = 0;
    this.newRecord = false;
    this.penaltyMs = 0;
    this.recentIsos = [];
    this.startedAt = performance.now();
    this.remainingMs = BLITZ_DURATION_MS;
    this.nextQuestion();
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  async answer(choice: BlitzChoice): Promise<void> {
    if (this.phase !== 'playing' || this.locked || !this.target) {
      return;
    }
    this.locked = true;
    this.answered += 1;
    this.flashKey = choice.key;
    this.flashCorrect = choice.correct;
    const target = this.target;
    if (choice.correct) {
      this.streak += 1;
      this.correctCount += 1;
      this.score += blitzPoints(this.streak);
    } else {
      this.streak = 0;
      this.penaltyMs += BLITZ_WRONG_PENALTY_MS;
      this.penaltyPulse = true;
      setTimeout(() => (this.penaltyPulse = false), 600);
    }
    void this.learning.recordAttempt('quiz', target.iso2, choice.correct, false);
    if (choice.correct) {
      void this.dailyGoal.bumpProgress();
    }
    setTimeout(() => {
      this.flashKey = null;
      this.locked = false;
      if (this.phase === 'playing') {
        this.nextQuestion();
      }
    }, FLASH_MS);
  }

  choiceState(choice: BlitzChoice): 'correct' | 'wrong' | 'default' {
    if (!this.flashKey) {
      return 'default';
    }
    if (choice.correct) {
      return 'correct';
    }
    return choice.key === this.flashKey ? 'wrong' : 'default';
  }

  goBack(): void {
    this.stopTimer();
    void this.router.navigate(['/tabs/play']);
  }

  private tick(): void {
    this.remainingMs = blitzRemainingMs(performance.now() - this.startedAt, this.penaltyMs);
    if (this.remainingMs <= 0) {
      void this.finish();
    }
  }

  private async finish(): Promise<void> {
    this.stopTimer();
    this.phase = 'done';
    this.flashKey = null;
    this.locked = false;
    await this.sessionAccess.recordCompletedGame();
    this.newRecord = await this.records.submit(this.recordId, this.score);
    if (this.newRecord) {
      this.best = this.score;
    }
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private nextQuestion(): void {
    const fresh = this.pool.filter((c) => !this.recentIsos.includes(c.iso2));
    const source = fresh.length >= 4 ? fresh : this.pool;
    const target = source[Math.floor(Math.random() * source.length)]!;
    this.recentIsos = [...this.recentIsos, target.iso2].slice(-Math.min(20, this.pool.length - 4));
    this.target = target;
    const lang = this.locale.language;
    if (this.mode === 'flags') {
      this.choices = buildQuizChoices(target, this.pool, (c) =>
        this.catalog.localizedName(c, lang),
      ).map((c) => ({
        key: c.country.iso2,
        label: c.label,
        correct: c.country.iso2 === target.iso2,
      }));
      return;
    }
    this.choices = buildQuizChoices(target, this.pool, (c) =>
      this.catalog.localizedCapital(c, lang),
    ).map((c) => ({
      key: c.country.iso2,
      label: c.label,
      correct: c.country.iso2 === target.iso2,
    }));
  }
}
