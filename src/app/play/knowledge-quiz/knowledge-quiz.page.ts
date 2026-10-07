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

type KnowledgeRoundKind = 'flag' | 'capital' | 'fact';

type Phase = 'pick' | 'feedback';

const ROUNDS = 10;

@Component({
  selector: 'app-knowledge-quiz',
  templateUrl: './knowledge-quiz.page.html',
  styleUrls: ['./knowledge-quiz.page.scss'],
  standalone: false,
})
export class KnowledgeQuizPage implements ViewDidEnter {
  readonly catalog = inject(CountriesCatalogService);
  readonly knowledge = inject(CountryKnowledgeService);
  readonly locale = inject(LocaleService);

  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly learning = inject(UserLearningService);
  private readonly askedIsos = new Set<string>();
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);

  loading = true;
  empty = false;
  pool: Country[] = [];
  facts: { country: Country; fact: CountryFact }[] = [];
  kind: KnowledgeRoundKind = 'flag';
  target: Country | null = null;
  targetFact: CountryFact | null = null;
  choices: QuizChoice[] = [];
  factChoices: string[] = [];
  phase: Phase = 'pick';
  feedbackCorrect = false;
  selectedIso: string | null = null;
  selectedFactText = '';
  round = 1;
  readonly roundsTotal = ROUNDS;

  ionViewDidEnter(): void {
    void this.boot();
  }

  get promptText(): string {
    if (this.kind === 'fact' && this.targetFact) {
      return this.knowledge.factText(this.targetFact, this.locale.language);
    }
    if (this.target && this.kind === 'capital') {
      return this.locale.translate('challenge.countryToCapital', {
        country: this.catalog.localizedName(this.target, this.locale.language),
      });
    }
    return this.locale.translate('challenge.flagToCountry');
  }

  async pickCountry(c: QuizChoice): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedIso = c.country.iso2;
    await this.finish(c.country.iso2 === this.target.iso2);
  }

  async pickFact(text: string): Promise<void> {
    if (this.phase !== 'pick' || !this.targetFact) {
      return;
    }
    this.selectedFactText = text;
    const expected = this.knowledge.factText(this.targetFact, this.locale.language);
    await this.finish(text === expected);
  }

  async nextRound(): Promise<void> {
    if (this.round >= ROUNDS) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.quizTitle',
          doneHeaderKey: 'quiz.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS,
          subtitleKey: 'play.knowledgeQuizTitle',
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
      this.pool = await this.playPool.getLearnedCountries();
      this.facts = await this.playPool.getLearnedFacts();
      this.empty = this.pool.length < 2 && this.facts.length < 2;
      if (!this.empty) {
        this.startRound();
      }
    } finally {
      this.loading = false;
    }
  }

  private startRound(): void {
    const useFact =
      this.facts.length > 0 && (this.pool.length < 2 || Math.random() < 0.35);
    if (useFact) {
      const idx = Math.floor(Math.random() * this.facts.length);
      const row = this.facts[idx];
      if (row) {
        this.kind = 'fact';
        this.target = row.country;
        this.targetFact = row.fact;
        this.factChoices = this.buildFactChoices(row);
        this.phase = 'pick';
        return;
      }
    }
    if (this.pool.length < 4) {
      return;
    }
    this.target = this.learning.pickForReview(this.pool, this.askedIsos);
    if (!this.target) {
      return;
    }
    this.askedIsos.add(this.target.iso2);
    this.kind = Math.random() < 0.5 ? 'flag' : 'capital';
    this.targetFact = null;
    if (this.kind === 'flag') {
      this.choices = buildQuizChoices(this.target, this.pool, (c) =>
        this.catalog.localizedName(c, this.locale.language),
      );
    } else {
      this.choices = buildQuizChoices(
        this.target,
        this.pool,
        (c) => this.catalog.localizedCapital(c, this.locale.language),
      );
    }
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.selectedIso = null;
  }

  private buildFactChoices(row: { country: Country; fact: CountryFact }): string[] {
    const correct = this.knowledge.factText(row.fact, this.locale.language);
    const others = new Set<string>();
    const shuffled = [...this.facts].sort(() => Math.random() - 0.5);
    for (const f of shuffled) {
      if (f.fact.id === row.fact.id) {
        continue;
      }
      others.add(this.knowledge.factText(f.fact, this.locale.language));
      if (others.size >= 3) {
        break;
      }
    }
    return [correct, ...others].sort(() => Math.random() - 0.5);
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
