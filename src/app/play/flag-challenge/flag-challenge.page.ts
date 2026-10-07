import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import type { FreeChallengeMode } from '../../core/data/play-tier.constants';
import type { Country } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { LearningPathService } from '../../core/services/learning-path.service';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import {
  passPlayAdvanceTurn,
  passPlayConfirmBuzzCorrect,
  passPlayCurrentPlayer,
  passPlayIsBuzzer,
  passPlayIsComplete,
  passPlayRecordBuzz,
  passPlayRejectBuzz,
  passPlayTotalRounds,
} from '../../core/services/pass-play-session';
import { ensurePlaySessionAccess, ensurePremiumPlayAccess } from '../../core/utils/play-access';
import { playDebug } from '../../core/utils/play-debug';
import {
  buildPassPlaySessionResult,
  buildSoloSessionResult,
} from '../../core/utils/play-session-result-builders';
import { buildQuizChoices, type QuizChoice } from '../../core/utils/quiz-options';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { DifficultyService } from '../../core/services/difficulty.service';

type Phase = 'pick' | 'feedback';

const ROUNDS = 10;

@Component({
  selector: 'app-flag-challenge',
  templateUrl: './flag-challenge.page.html',
  styleUrls: ['./flag-challenge.page.scss'],
  standalone: false,
})
export class FlagChallengePage implements ViewDidEnter {
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);
  private readonly learningPath = inject(LearningPathService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly difficulty = inject(DifficultyService);

  mode: FreeChallengeMode = 'flag_pick_country';
  loading = true;
  pool: Country[] = [];
  target: Country | null = null;
  choices: QuizChoice[] = [];
  capitalChoices: string[] = [];
  phase: Phase = 'pick';
  feedbackCorrect = false;
  selectedIso: string | null = null;
  selectedCapital = '';
  typedName = '';
  round = 1;
  /** Correct answers in a row (solo sessions). */
  streak = 0;

  /** Countries already asked this session (no repeats). */
  private readonly askedIsos = new Set<string>();

  private bootStarted = false;

  get passPlay() {
    return this.playSession.passPlay;
  }

  get roundsTotal(): number {
    const pp = this.passPlay;
    return pp ? passPlayTotalRounds(pp) : ROUNDS;
  }

  get passPlayTurnName(): string {
    const pp = this.passPlay;
    return pp ? passPlayCurrentPlayer(pp) : '';
  }

  get passPlayBuzzer(): boolean {
    const pp = this.passPlay;
    return !!pp && passPlayIsBuzzer(pp);
  }

  get buzzPlayerName(): string {
    const pp = this.passPlay;
    if (!pp || pp.buzzPlayerIndex === null) {
      return '';
    }
    return pp.players[pp.buzzPlayerIndex] ?? '';
  }

  get passPlayPlayerButtons(): { name: string; index: number }[] {
    const pp = this.passPlay;
    if (!pp) {
      return [];
    }
    return pp.players.map((name, index) => ({ name, index }));
  }

  ionViewDidEnter(): void {
    if (this.bootStarted) {
      return;
    }
    const mode = this.route.snapshot.paramMap.get('mode') as FreeChallengeMode | null;
    if (mode === 'flag_find_map') {
      void this.startMapMode();
      return;
    }
    if (!mode) {
      void this.router.navigate(['/tabs/play']);
      return;
    }
    this.mode = mode;
    void this.boot();
  }

  get promptText(): string {
    if (!this.target) {
      return '';
    }
    switch (this.mode) {
      case 'flag_pick_country':
      case 'flag_type_country':
        return this.locale.translate('challenge.flagToCountry');
      case 'capital_pick_country':
        return this.locale.translate('challenge.capitalToCountry', {
          capital: this.catalog.localizedCapital(this.target, this.locale.language),
        });
      case 'country_pick_capital':
        return this.locale.translate('challenge.countryToCapital', {
          country: this.catalog.localizedName(this.target, this.locale.language),
        });
      default:
        return '';
    }
  }

  get showFlag(): boolean {
    return (
      this.mode === 'flag_pick_country' ||
      this.mode === 'flag_type_country' ||
      this.mode === 'country_pick_capital'
    );
  }

  get showCapitalPrompt(): boolean {
    return this.mode === 'capital_pick_country';
  }

  async verifyTyped(): Promise<void> {
    if (this.phase !== 'pick' || !this.target || this.mode !== 'flag_type_country') {
      return;
    }
    const expected = this.catalog
      .localizedName(this.target, this.locale.language)
      .trim()
      .toLowerCase();
    const alt = this.target.names.en.trim().toLowerCase();
    const got = this.typedName.trim().toLowerCase();
    const correct = got === expected || got === alt;
    await this.finishAnswer(correct, false);
  }

  async pickCountry(choice: QuizChoice): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedIso = choice.country.iso2;
    const correct = choice.country.iso2 === this.target.iso2;
    await this.finishAnswer(correct, false, choice.country.iso2);
  }

  async pickCapital(capital: string): Promise<void> {
    if (this.phase !== 'pick' || !this.target) {
      return;
    }
    this.selectedCapital = capital;
    const expected = this.catalog.localizedCapital(this.target, this.locale.language);
    const correct = capital === expected;
    await this.finishAnswer(correct, false);
  }

  async buzzIn(playerIndex: number): Promise<void> {
    const pp = this.passPlay;
    if (!pp || !passPlayIsBuzzer(pp) || this.phase !== 'pick' || !this.target) {
      return;
    }
    const updated = passPlayRecordBuzz(pp, playerIndex);
    this.playSession.passPlay = updated;
    this.phase = 'feedback';
    playDebug('PassPlay', 'buzzIn', {
      player: updated.players[playerIndex],
      round: this.round,
    });
  }

  async confirmBuzzCorrect(): Promise<void> {
    await this.advancePassPlayAfterBuzz(true);
  }

  async rejectBuzz(): Promise<void> {
    await this.advancePassPlayAfterBuzz(false);
  }

  async skipBuzzRound(): Promise<void> {
    const pp = this.passPlay;
    if (!pp || !passPlayIsBuzzer(pp)) {
      return;
    }
    const updated = passPlayRejectBuzz(pp);
    await this.completePassPlayRound(updated);
  }

  async nextRound(): Promise<void> {
    const pp = this.passPlay;
    if (pp && passPlayIsBuzzer(pp)) {
      return;
    }
    if (pp) {
      const updated = passPlayAdvanceTurn(pp, this.feedbackCorrect);
      await this.completePassPlayRound(updated);
      return;
    }
    if (this.round >= ROUNDS) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.quizTitle',
          doneHeaderKey: 'quiz.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS,
          subtitleKey: `challenge.mode.${this.mode}`,
        }),
      );
      return;
    }
    this.round += 1;
    this.startRound();
  }

  goBack(): void {
    this.playSession.clear();
    void this.router.navigate(['/tabs/play']);
  }

  openTargetOnGlobe(): void {
    const iso = this.target?.iso2;
    if (!iso) {
      return;
    }
    void this.router.navigate(['/tabs/play/globe-find'], {
      queryParams: { focus: iso.toUpperCase() },
    });
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

  capitalChoiceState(cap: string): 'default' | 'correct' | 'wrong' {
    if (this.phase !== 'feedback' || !this.target) {
      return 'default';
    }
    const expected = this.catalog.localizedCapital(this.target, this.locale.language);
    if (cap === expected) {
      return 'correct';
    }
    if (cap === this.selectedCapital) {
      return 'wrong';
    }
    return 'default';
  }

  private async startMapMode(): Promise<void> {
    this.bootStarted = true;
    if (!(await ensurePremiumPlayAccess(this.subscription, this.router))) {
      return;
    }
    const allowed = await ensurePlaySessionAccess(
      this.subscription,
      this.sessionAccess,
      this.router,
    );
    if (!allowed) {
      return;
    }
    const pool = await this.playSession.resolvePool();
    this.playSession.setPool(pool);
    void this.router.navigate(['/tabs/play/map-find'], { replaceUrl: true });
  }

  private async boot(): Promise<void> {
    this.bootStarted = true;
    const passPlay = this.playSession.passPlay;
    if (!passPlay) {
      const allowed = await ensurePlaySessionAccess(
        this.subscription,
        this.sessionAccess,
        this.router,
      );
      if (!allowed) {
        this.loading = false;
        return;
      }
    } else if (
      passPlay.mode !== this.mode ||
      (passPlayIsBuzzer(passPlay) && this.mode === 'flag_type_country')
    ) {
      void this.router.navigate(['/tabs/play']);
      this.loading = false;
      return;
    }
    try {
      await Promise.all([this.catalog.ensureLoaded(), this.difficulty.hydrate()]);
      this.pool = await this.playSession.resolvePool();
      if (this.pool.length < 4 && this.mode !== 'flag_type_country') {
        this.loading = false;
        return;
      }
      if (passPlay) {
        this.round = passPlay.roundIndex;
      }
      this.startRound();
    } finally {
      this.loading = false;
    }
  }

  private startRound(): void {
    if (!this.pool.length) {
      return;
    }
    if (this.playSession.sessionKind === 'continent_mixed' && !this.passPlay) {
      this.mode =
        Math.random() < 0.5 ? 'flag_pick_country' : 'capital_pick_country';
      playDebug('FlagChallenge', 'continent_mixed round mode', this.mode);
    }
    this.target = this.learning.pickForReview(this.pool, this.askedIsos);
    if (!this.target) {
      return;
    }
    this.askedIsos.add(this.target.iso2);
    playDebug('FlagChallenge', 'startRound', {
      mode: this.mode,
      target: this.target.iso2,
      round: this.round,
    });
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.selectedIso = null;
    this.selectedCapital = '';
    this.typedName = '';

    const buzzer = this.passPlay && passPlayIsBuzzer(this.passPlay);
    if (!buzzer) {
      if (
        this.mode === 'flag_pick_country' ||
        this.mode === 'capital_pick_country'
      ) {
        this.choices = buildQuizChoices(
          this.target,
          this.pool,
          (c) => this.catalog.localizedName(c, this.locale.language),
          this.difficulty.choiceOptions(this.target, this.mode === 'flag_pick_country'),
        );
      }
      if (this.mode === 'country_pick_capital') {
        this.capitalChoices = this.buildCapitalChoices(this.target);
      }
    } else {
      this.choices = [];
      this.capitalChoices = [];
    }
  }

  private buildCapitalChoices(target: Country): string[] {
    const correct = this.catalog.localizedCapital(target, this.locale.language);
    const others = new Set<string>();
    const shuffled = [...this.pool].sort(() => Math.random() - 0.5);
    for (const c of shuffled) {
      if (c.iso2 === target.iso2) {
        continue;
      }
      others.add(this.catalog.localizedCapital(c, this.locale.language));
      if (others.size >= 3) {
        break;
      }
    }
    return [correct, ...others].sort(() => Math.random() - 0.5);
  }

  private async advancePassPlayAfterBuzz(awardPoint: boolean): Promise<void> {
    const pp = this.playSession.passPlay;
    if (!pp || !passPlayIsBuzzer(pp)) {
      return;
    }
    const updated = awardPoint
      ? passPlayConfirmBuzzCorrect(pp)
      : passPlayRejectBuzz(pp);
    if (this.target) {
      await this.learning.recordAttempt(
        'quiz',
        this.target.iso2,
        awardPoint,
        false,
      );
    }
    playDebug('PassPlay', 'buzz resolved', {
      awardPoint,
      buzzer: pp.players[pp.buzzPlayerIndex ?? -1],
    });
    await this.completePassPlayRound(updated);
  }

  private async completePassPlayRound(
    updated: NonNullable<typeof this.playSession.passPlay>,
  ): Promise<void> {
    this.playSession.passPlay = updated;
    if (passPlayIsComplete(updated)) {
      await this.sessionComplete.finishWithResult(
        buildPassPlaySessionResult(updated),
      );
      return;
    }
    this.round = updated.roundIndex;
    this.startRound();
  }

  private async finishAnswer(
    correct: boolean,
    usedSearch: boolean,
    pickedIso?: string,
  ): Promise<void> {
    if (!this.target) {
      return;
    }
    this.feedbackCorrect = correct;
    this.phase = 'feedback';
    await this.learning.recordAttempt('quiz', this.target.iso2, correct, usedSearch, pickedIso);
    if (this.passPlay) {
      playDebug('PassPlay', 'round answer', { correct, round: this.round });
    } else {
      this.playSession.recordAnswer(correct);
      this.streak = correct ? this.streak + 1 : 0;
    }
    if (correct && !this.passPlay) {
      await this.dailyGoal.bumpProgress();
      await this.recordLearningPathProgress();
    }
  }

  private async recordLearningPathProgress(): Promise<void> {
    const levelId = this.playSession.levelId;
    if (!levelId) {
      return;
    }
    await this.learningPath.ensureLoaded();
    const progress = await this.learningPath.recordCorrect(levelId);
    playDebug('FlagChallenge', 'level progress', { levelId, progress });
  }
}
