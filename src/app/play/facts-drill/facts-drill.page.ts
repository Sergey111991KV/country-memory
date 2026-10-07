import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import type { Country } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { CountryKnowledgeService } from '../../core/services/country-knowledge.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LearningPathService } from '../../core/services/learning-path.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import { ensurePlaySessionAccess } from '../../core/utils/play-access';
import {
  buildProfileFieldChoices,
  pickFactsDrillRoundKind,
  profileFieldIdForKind,
  type FactsDrillRoundKind,
} from '../../core/utils/facts-drill-options';
import { playDebug } from '../../core/utils/play-debug';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';
import { buildQuizChoices, type QuizChoice } from '../../core/utils/quiz-options';

type Phase = 'pick' | 'feedback';

const ROUNDS = 10;

@Component({
  selector: 'app-facts-drill',
  templateUrl: './facts-drill.page.html',
  styleUrls: ['./facts-drill.page.scss'],
  standalone: false,
})
export class FactsDrillPage implements ViewDidEnter {
  readonly catalog = inject(CountriesCatalogService);
  readonly knowledge = inject(CountryKnowledgeService);
  readonly locale = inject(LocaleService);

  private readonly router = inject(Router);
  private readonly playSession = inject(PlaySessionService);
  private readonly learning = inject(UserLearningService);
  private readonly askedIsos = new Set<string>();
  private readonly learningPath = inject(LearningPathService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);

  loading = true;
  pool: Country[] = [];
  target: Country | null = null;
  roundKind: FactsDrillRoundKind = 'population';
  promptValue = '';
  promptLabelKey = '';
  choices: QuizChoice[] = [];
  phase: Phase = 'pick';
  feedbackCorrect = false;
  selectedIso: string | null = null;
  round = 1;
  readonly roundsTotal = ROUNDS;

  ionViewDidEnter(): void {
    void this.boot();
  }

  get showFlag(): boolean {
    return this.roundKind === 'flag';
  }

  get promptText(): string {
    if (this.roundKind === 'flag') {
      return this.locale.translate('challenge.flagToCountry');
    }
    const fieldLabel = this.locale.translate(this.promptLabelKey);
    return this.locale.translate('factsDrill.promptProfile', {
      field: fieldLabel,
      value: this.promptValue,
    });
  }

  async pickCountry(choice: QuizChoice): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedIso = choice.country.iso2;
    const correct = choice.country.iso2 === this.target.iso2;
    await this.finishAnswer(correct);
  }

  async nextRound(): Promise<void> {
    if (this.round >= ROUNDS) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.factsDrillTitle',
          doneHeaderKey: 'factsDrill.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS,
        }),
      );
      return;
    }
    this.round += 1;
    this.startRound();
  }

  goBack(): void {
    playDebug('FactsDrill', 'goBack');
    this.playSession.clear();
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
    playDebug('FactsDrill', 'boot start', {
      kind: this.playSession.sessionKind,
      levelId: this.playSession.levelId,
      mixFlags: this.playSession.mixFlags,
    });
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
      this.pool = await this.playSession.resolvePool();
      if (this.pool.length < 2) {
        playDebug('FactsDrill', 'boot aborted — pool too small', {
          count: this.pool.length,
        });
        void this.router.navigate(['/tabs/play']);
        return;
      }
      this.startRound();
    } finally {
      this.loading = false;
      playDebug('FactsDrill', 'boot done', { pool: this.pool.length });
    }
  }

  private startRound(): void {
    if (!this.pool.length) {
      return;
    }
    const mixFlags =
      this.playSession.mixFlags || this.playSession.sessionKind === 'facts_mixed';
    const pinnedKind = this.playSession.factsDrillKind;
    this.roundKind =
      this.round === 1 && pinnedKind
        ? pinnedKind
        : pickFactsDrillRoundKind(mixFlags);
    this.target = this.learning.pickForReview(this.pool, this.askedIsos);
    if (!this.target) {
      return;
    }
    this.askedIsos.add(this.target.iso2);
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.selectedIso = null;
    this.promptValue = '';
    this.promptLabelKey = '';

    playDebug('FactsDrill', 'startRound', {
      round: this.round,
      kind: this.roundKind,
      target: this.target.iso2,
    });

    if (this.roundKind === 'flag') {
      this.choices = buildQuizChoices(this.target, this.pool, (c) =>
        this.catalog.localizedName(c, this.locale.language),
      );
      return;
    }

    const fieldId = profileFieldIdForKind(this.roundKind);
    if (!fieldId) {
      return;
    }
    const fields = this.knowledge.getProfileFields(
      this.target,
      this.locale.language,
    );
    const field = fields.find((f) => f.fieldId === fieldId);
    this.promptValue = field?.value ?? '—';
    this.promptLabelKey = field?.labelKey ?? 'knowledge.field.population';
    this.choices = buildProfileFieldChoices(
      this.target,
      this.pool,
      fieldId,
      this.catalog,
      this.knowledge,
      this.locale.language,
    );
  }

  private async finishAnswer(correct: boolean): Promise<void> {
    if (!this.target) {
      return;
    }
    this.feedbackCorrect = correct;
    this.phase = 'feedback';
    await this.learning.recordAttempt('facts_drill', this.target.iso2, correct, false);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
      const levelId = this.playSession.levelId;
      if (levelId) {
        await this.learningPath.ensureLoaded();
        const progress = await this.learningPath.recordCorrect(levelId);
        playDebug('FactsDrill', 'level progress', { levelId, progress });
      }
    }
  }
}
