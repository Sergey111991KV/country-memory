import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import type { Country } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import { buildQuizChoices, type QuizChoice } from '../../core/utils/quiz-options';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';

type QuizPhase = 'pick' | 'feedback';

const ROUNDS_PER_SESSION = 10;

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: false,
})
export class QuizPage implements ViewDidEnter {
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);

  private readonly router = inject(Router);
  private readonly learning = inject(UserLearningService);
  private readonly askedIsos = new Set<string>();
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly playSession = inject(PlaySessionService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);

  loading = true;
  pool: Country[] = [];
  target: Country | null = null;
  choices: QuizChoice[] = [];
  phase: QuizPhase = 'pick';
  feedbackCorrect = false;
  selectedIso: string | null = null;
  round = 1;
  private bootStarted = false;

  readonly roundsTotal = ROUNDS_PER_SESSION;

  ionViewDidEnter(): void {
    if (this.bootStarted) {
      return;
    }
    void this.startSession();
  }

  private async startSession(): Promise<void> {
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    await this.boot();
  }

  get targetLabel(): string {
    if (!this.target) {
      return '';
    }
    return this.catalog.localizedName(this.target, this.locale.language);
  }

  get showFeedback(): boolean {
    return this.phase === 'feedback';
  }

  choiceState(iso2: string): 'default' | 'selected' | 'correct' | 'wrong' {
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

  async pickChoice(choice: QuizChoice): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedIso = choice.country.iso2;
    const correct = choice.country.iso2 === this.target.iso2;
    this.feedbackCorrect = correct;
    this.phase = 'feedback';

    await this.learning.recordAttempt('quiz', this.target.iso2, correct, false, choice.country.iso2);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
  }

  async nextRound(): Promise<void> {
    if (this.round >= ROUNDS_PER_SESSION) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.quizTitle',
          doneHeaderKey: 'quiz.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS_PER_SESSION,
          subtitleKey: 'play.quizTitle',
        }),
      );
      return;
    }
    this.round += 1;
    this.startRound();
  }

  explainLine(country: Country): string {
    return this.locale.translate('globe.explainLine', {
      capital: this.catalog.localizedCapital(country, this.locale.language),
      continent: this.locale.translate(`continent.${country.continent}`),
    });
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  private async boot(): Promise<void> {
    try {
      await this.catalog.ensureLoaded();
      this.pool = await this.playSession.resolvePool();
      this.startRound();
      this.loading = false;
    } catch {
      this.loading = false;
    }
  }

  private startRound(): void {
    if (this.pool.length < 4) {
      return;
    }
    this.target = this.learning.pickForReview(this.pool, this.askedIsos);
    if (!this.target) {
      return;
    }
    this.askedIsos.add(this.target.iso2);
    this.choices = buildQuizChoices(this.target, this.pool, (c) =>
      this.catalog.localizedName(c, this.locale.language),
    );
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.selectedIso = null;
  }
}
