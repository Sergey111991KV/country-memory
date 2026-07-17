import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewWillEnter } from '@ionic/angular';

import type { Country } from '../core/data/country.types';
import type { HomeFeedCard } from '../core/services/home-feed.service';
import { HomeFeedService } from '../core/services/home-feed.service';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CourseLaunchService } from '../core/services/course-launch.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { DonatePromptService } from '../core/services/donate-prompt.service';
import { LearningPathService } from '../core/services/learning-path.service';
import { LocaleService } from '../core/services/locale.service';
import { PlayModePreferenceService } from '../core/services/play-mode-preference.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { PlaySessionService } from '../core/services/play-session.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { UserLearningService } from '../core/services/user-learning.service';
import { PerfLogService } from '../core/services/perf-log.service';
import { isBillingEnabled } from '../core/utils/billing-mode';
import { ensurePlaySessionAccess } from '../core/utils/play-access';
import { playDebug } from '../core/utils/play-debug';
import { buildQuizChoices, type QuizChoice } from '../core/utils/quiz-options';
import { feedPromptKey, resolveFeedCardLaunch } from './play-feed-launch';
import { resolveLevelLaunchPlan } from './play-level-route';
import { resolveSettingsPlayMode } from './play-mode-catalog';
import { resolvePlayModeLaunch } from './play-mode-launch';
import type { PlayModeSlide } from './play-mode.types';
export type {
  PlayCategoryId,
  PlayCategorySlide,
  PlayModeAction,
  PlayModeSlide,
} from './play-mode.types';

interface PlayRefreshSnapshot {
  subscribed: boolean;
  atGameLimit: boolean;
}

type FeedPhase = 'pick' | 'feedback';

const FEED_ROTATE_MS = 14_000;

@Component({
  selector: 'app-play',
  templateUrl: './play.page.html',
  styleUrls: ['./play.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayPage implements OnInit, ViewWillEnter {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  protected readonly locale = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly catalog = inject(CountriesCatalogService);
  private readonly courseLaunch = inject(CourseLaunchService);
  private readonly learningPath = inject(LearningPathService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly playModePreference = inject(PlayModePreferenceService);
  private readonly homeFeed = inject(HomeFeedService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  readonly sessionAccess = inject(SessionAccessService);
  readonly sub = inject(SubscriptionService);
  private readonly donatePrompt = inject(DonatePromptService);
  private readonly perf = inject(PerfLogService);

  atGameLimit = false;
  feedCard: HomeFeedCard | null = null;
  feedCardPhase: 'idle' | 'fade' = 'idle';
  feedPhase: FeedPhase = 'pick';
  choices: QuizChoice[] = [];
  feedbackCorrect = false;
  selectedIso: string | null = null;
  private choicePool: Country[] = [];
  private feedRotateTimer: ReturnType<typeof setInterval> | null = null;
  private lastRefreshSnapshot: PlayRefreshSnapshot | null = null;

  ngOnInit(): void {
    this.feedRotateTimer = setInterval(() => this.rotateFeedCard(), FEED_ROTATE_MS);
    this.destroyRef.onDestroy(() => {
      if (this.feedRotateTimer !== null) {
        clearInterval(this.feedRotateTimer);
      }
    });
    void this.refresh();
  }

  ionViewWillEnter(): void {
    void this.refresh({ fromViewEnter: true });
    void this.refreshFeed();
    void this.donatePrompt.maybeNavigateToDonate();
  }

  get promptText(): string {
    if (!this.feedCard) {
      return '';
    }
    return this.locale.translate(feedPromptKey(this.feedCard.kind));
  }

  hasPlayPremium(): boolean {
    return !isBillingEnabled() || this.sub.isSubscribed();
  }

  trackChoice(_index: number, choice: QuizChoice): string {
    return choice.country.iso2;
  }

  choiceState(choice: QuizChoice): 'default' | 'correct' | 'wrong' {
    if (this.feedPhase !== 'feedback' || !this.feedCard) {
      return 'default';
    }
    if (choice.country.iso2.toUpperCase() === this.feedCard.iso) {
      return 'correct';
    }
    if (choice.country.iso2 === this.selectedIso) {
      return 'wrong';
    }
    return 'default';
  }

  async refreshFeed(): Promise<void> {
    await this.homeFeed.ensureDeck();
    await this.catalog.ensureLoaded();
    this.choicePool = await this.playPool.getFilteredFreePool();
    this.feedCard = this.homeFeed.currentCard();
    this.resetRoundState();
    this.buildChoicesForCard();
    this.cdr.markForCheck();
  }

  rotateFeedCard(): void {
    if (!this.feedCard || this.feedPhase === 'feedback') {
      return;
    }
    this.advanceCardWithFade();
  }

  nextFeedCard(): void {
    this.advanceCardWithFade();
  }

  openFeedCountryOnGlobe(): void {
    const iso = this.feedCard?.iso;
    if (!iso) {
      return;
    }
    void this.router.navigate(['/tabs/play/globe-find'], {
      queryParams: { focus: iso.toUpperCase() },
    });
  }

  async answerChoice(choice: QuizChoice): Promise<void> {
    if (this.feedPhase !== 'pick' || !this.feedCard) {
      return;
    }
    this.selectedIso = choice.country.iso2;
    const correct = choice.country.iso2.toUpperCase() === this.feedCard.iso;
    this.feedbackCorrect = correct;
    this.feedPhase = 'feedback';
    this.cdr.markForCheck();
    await this.learning.recordAttempt('quiz', this.feedCard.iso, correct, false);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
    playDebug('PlayHub', 'feedAnswer', {
      kind: this.feedCard.kind,
      iso: this.feedCard.iso,
      correct,
    });
  }

  /** Starts the mode chosen in Settings → Game settings. */
  async playQuick(): Promise<void> {
    await this.playModePreference.hydrate();
    const slide = resolveSettingsPlayMode(
      this.playModePreference.getModeId(),
      this.hasPlayPremium(),
    );
    await this.launchMode(slide);
  }

  async playFeedCard(): Promise<void> {
    if (!this.feedCard) {
      return;
    }
    const card = this.feedCard;
    const pool = this.choicePool.length
      ? this.choicePool
      : await this.playPool.getFilteredFreePool();
    const iso = card.iso;
    const match = pool.find((c) => c.iso2.toUpperCase() === iso);
    const sessionPool = match
      ? [match, ...pool.filter((c) => c.iso2.toUpperCase() !== iso).slice(0, 3)]
      : pool.slice(0, 4);
    if (sessionPool.length < 2) {
      await this.presentRecallEmptyAlert('settings.metricFilterEmptyPool');
      return;
    }
    if (!(await this.guardPlayAccess())) {
      return;
    }
    const launch = resolveFeedCardLaunch(card.kind);
    this.playSession.clear();
    this.playSession.setPool(sessionPool);
    this.playSession.setMeta(launch.meta);
    playDebug('PlayHub', 'playFeedCard', { kind: card.kind, iso: card.iso });
    void this.router.navigate(launch.commands);
  }

  async refresh(options?: { fromViewEnter?: boolean }): Promise<void> {
    const span = this.perf.span('PlayHub', 'refresh');
    if (isBillingEnabled()) {
      await this.sub.init();
    }
    await this.sessionAccess.hydrate();
    this.atGameLimit =
      isBillingEnabled() &&
      !this.sub.isSubscribed() &&
      !this.sessionAccess.canStartGame(false);

    const subscribed = this.hasPlayPremium();
    const snapshot: PlayRefreshSnapshot = {
      subscribed,
      atGameLimit: this.atGameLimit,
    };
    if (
      options?.fromViewEnter &&
      this.lastRefreshSnapshot &&
      this.refreshSnapshotsEqual(this.lastRefreshSnapshot, snapshot)
    ) {
      this.cdr.markForCheck();
      span.end({ skipped: true, reason: 'snapshot' });
      return;
    }

    this.lastRefreshSnapshot = snapshot;
    this.cdr.markForCheck();
    span.end({ skipped: false });
  }

  private advanceCardWithFade(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.feedCard = this.homeFeed.advance();
      this.resetRoundState();
      this.buildChoicesForCard();
      this.cdr.markForCheck();
      return;
    }
    this.feedCardPhase = 'fade';
    this.cdr.markForCheck();
    window.setTimeout(() => {
      this.feedCard = this.homeFeed.advance();
      this.resetRoundState();
      this.buildChoicesForCard();
      this.feedCardPhase = 'idle';
      this.cdr.markForCheck();
    }, 220);
  }

  private resetRoundState(): void {
    this.feedPhase = 'pick';
    this.feedbackCorrect = false;
    this.selectedIso = null;
    this.choices = [];
  }

  private buildChoicesForCard(): void {
    if (!this.feedCard || this.choicePool.length < 2) {
      this.choices = [];
      return;
    }
    const target =
      this.choicePool.find((c) => c.iso2.toUpperCase() === this.feedCard!.iso) ??
      null;
    if (!target) {
      this.choices = [];
      return;
    }
    this.choices = buildQuizChoices(target, this.choicePool, (c) =>
      this.catalog.localizedName(c, this.locale.language),
    );
  }

  private refreshSnapshotsEqual(
    a: PlayRefreshSnapshot,
    b: PlayRefreshSnapshot,
  ): boolean {
    return a.subscribed === b.subscribed && a.atGameLimit === b.atGameLimit;
  }

  async launchMode(slide: PlayModeSlide): Promise<void> {
    playDebug('PlayHub', 'launchMode', { id: slide.id, action: slide.action });

    const courseLaunch =
      slide.action.type === 'course_challenge'
        ? this.courseLaunch.getLaunch(slide.action.launchId)
        : undefined;
    const launch = resolvePlayModeLaunch(slide.action, {
      isSubscribed: this.hasPlayPremium(),
      courseLaunch,
    });

    if (launch.kind === 'paywall') {
      playDebug('PlayHub', 'launchMode → paywall');
      void this.router.navigate(['/paywall']);
      return;
    }
    if (slide.needsPlayGuard && !(await this.guardPlayAccess())) {
      playDebug('PlayHub', 'launchMode blocked by play guard');
      return;
    }

    if (slide.action.type === 'free') {
      const pool = await this.playPool.getFilteredFreePool();
      if (pool.length < 2) {
        await this.presentRecallEmptyAlert('settings.metricFilterEmptyPool');
        return;
      }
      this.playSession.clear();
      this.playSession.setPool(pool);
      this.playSession.setMeta({ kind: 'default' });
    } else if (slide.action.type === 'recall_challenge') {
      const learned = await this.playPool.getFilteredLearnedCountries();
      const min = slide.action.mode === 'flag_type_country' ? 1 : 4;
      playDebug('PlayHub', 'recall pool', { learned: learned.length, min });
      if (learned.length < min) {
        await this.presentRecallEmptyAlert('play.recallEmpty');
        return;
      }
      this.playSession.clear();
      this.playSession.setPool(learned);
      this.playSession.setMeta({ kind: 'default' });
    } else if (slide.action.type === 'course_challenge') {
      const launchDef = this.courseLaunch.getLaunch(slide.action.launchId);
      const pool = await this.courseLaunch.resolvePool(slide.action.launchId);
      if (pool.length < 2) {
        await this.presentRecallEmptyAlert('course.emptyPool');
        return;
      }
      this.playSession.clear();
      this.playSession.setPool(pool);
      this.playSession.setMeta({
        kind: launchDef?.drillStyle === 'mixed' ? 'continent_mixed' : 'default',
      });
    } else if (slide.action.type === 'facts_drill') {
      const levelId = slide.action.levelId;
      let pool = await this.playPool.poolForTier();
      if (levelId === 'facts-starter') {
        pool = await this.playPool.getFilteredFreePool();
      }
      if (pool.length < 2) {
        await this.presentRecallEmptyAlert('settings.metricFilterEmptyPool');
        return;
      }
      this.playSession.clear();
      this.playSession.setPool(pool);
      this.playSession.setMeta({
        kind: 'facts_drill',
        levelId: levelId ?? null,
        mixFlags: slide.action.mixFlags ?? false,
      });
    } else if (slide.action.type === 'learning_level') {
      await this.pathEnsureForLevel(slide.action.levelId);
      return;
    } else if (slide.action.type === 'pass_play') {
      this.playSession.clear();
      this.playSession.pendingPassPlayScoring =
        slide.action.scoringStyle ?? 'turns';
      playDebug('PlayHub', 'pass_play scoring', {
        style: this.playSession.pendingPassPlayScoring,
        mode: slide.action.mode,
      });
    } else if (launch.premiumOnly) {
      this.playSession.clear();
      this.playSession.setMeta({ kind: 'default' });
    }

    playDebug('PlayHub', 'navigate', launch.commands);
    void this.router.navigate(launch.commands);
  }

  private guardPlayAccess(): Promise<boolean> {
    return ensurePlaySessionAccess(this.sub, this.sessionAccess, this.router);
  }

  private async pathEnsureForLevel(levelId: string): Promise<void> {
    await this.learningPath.ensureLoaded();
    const level = this.learningPath.getLevel(levelId);
    if (!level) {
      void this.router.navigate(['/tabs/play/learn']);
      return;
    }
    const pool = await this.learningPath.resolveLevelPool(level);
    if (pool.length < 2) {
      await this.presentRecallEmptyAlert('course.emptyPool');
      return;
    }
    const plan = resolveLevelLaunchPlan(level);
    this.playSession.clear();
    this.playSession.setPool(pool);
    this.playSession.setMeta(plan.meta);
    playDebug('PlayHub', 'pathEnsureForLevel', plan);
    void this.router.navigate(plan.commands);
  }

  private async presentRecallEmptyAlert(messageKey: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.locale.translate('play.recallEmptyTitle'),
      message: this.locale.translate(messageKey),
      buttons: [this.locale.translate('common.ok')],
    });
    await alert.present();
  }
}
