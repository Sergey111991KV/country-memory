import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import type { Country, CountryFact } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { CountryKnowledgeService } from '../../core/services/country-knowledge.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import { ensurePlaySessionAccess } from '../../core/utils/play-access';
import { buildQuizChoices, type QuizChoice } from '../../core/utils/quiz-options';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';

type Phase = 'pick' | 'feedback';

const ROUNDS = 10;

@Component({
  selector: 'app-facts-quiz',
  templateUrl: './facts-quiz.page.html',
  styleUrls: ['./facts-quiz.page.scss'],
  standalone: false,
})
export class FactsQuizPage implements ViewDidEnter {
  readonly catalog = inject(CountriesCatalogService);
  readonly knowledge = inject(CountryKnowledgeService);
  readonly locale = inject(LocaleService);

  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);

  loading = true;
  empty = false;
  factRows: { country: Country; fact: CountryFact }[] = [];
  countryPool: Country[] = [];
  target: Country | null = null;
  targetFact: CountryFact | null = null;
  choices: QuizChoice[] = [];
  phase: Phase = 'pick';
  feedbackCorrect = false;
  selectedIso: string | null = null;
  round = 1;
  readonly roundsTotal = ROUNDS;

  ionViewDidEnter(): void {
    void this.boot();
  }

  get factPrompt(): string {
    if (!this.targetFact) {
      return '';
    }
    return this.knowledge.factText(this.targetFact, this.locale.language);
  }

  get questionLabel(): string {
    return this.locale.translate('factsQuiz.whichCountry');
  }

  async pickCountry(c: QuizChoice): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedIso = c.country.iso2;
    const correct = c.country.iso2 === this.target.iso2;
    await this.finish(correct);
  }

  async nextRound(): Promise<void> {
    if (this.round >= ROUNDS) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.quizTitle',
          doneHeaderKey: 'quiz.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS,
          subtitleKey: 'play.factsQuizTitle',
        }),
      );
      return;
    }
    this.round += 1;
    this.startRound();
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  choiceState(iso2: string): 'default' | 'correct' | 'wrong' {
    if (this.phase !== 'feedback') {
      return 'default';
    }
    if (iso2 === this.target?.iso2) {
      return 'correct';
    }
    if (iso2 === this.selectedIso) {
      return 'wrong';
    }
    return 'default';
  }

  private async boot(): Promise<void> {
    const allowed = await ensurePlaySessionAccess(
      this.subscription,
      this.sessionAccess,
      this.router,
    );
    if (!allowed) {
      this.loading = false;
      return;
    }
    try {
      await this.catalog.ensureLoaded();
      await this.knowledge.ensureLoaded();
      this.factRows = await this.playPool.getFactQuizPool();
      this.countryPool = await this.playPool.getLearnedCountries();
      this.empty = this.factRows.length < 4 || this.countryPool.length < 4;
      if (!this.empty) {
        this.startRound();
      }
    } finally {
      this.loading = false;
    }
  }

  private startRound(): void {
    const idx = Math.floor(Math.random() * this.factRows.length);
    const row = this.factRows[idx];
    if (!row) {
      return;
    }
    this.target = row.country;
    this.targetFact = row.fact;
    this.choices = buildQuizChoices(row.country, this.countryPool, (c) =>
      this.catalog.localizedName(c, this.locale.language),
    );
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.selectedIso = null;
  }

  private async finish(correct: boolean): Promise<void> {
    if (!this.target) {
      return;
    }
    this.feedbackCorrect = correct;
    this.phase = 'feedback';
    await this.learning.recordAttempt('quiz', this.target.iso2, correct, false);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
  }
}
