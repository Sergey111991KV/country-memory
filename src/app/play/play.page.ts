import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewWillEnter } from '@ionic/angular';

import { CourseLaunchService } from '../core/services/course-launch.service';
import {
  buildPlayCategories,
  buildPlayModesByCategory,
} from './play-mode-catalog';
import { resolveLevelLaunchPlan } from './play-level-route';
import { resolvePlayModeLaunch } from './play-mode-launch';
import { playDebug } from '../core/utils/play-debug';
import type {
  PlayCategoryId,
  PlayCategorySlide,
  PlayModeSlide,
} from './play-mode.types';
export type {
  PlayCategoryId,
  PlayCategorySlide,
  PlayModeAction,
  PlayModeSlide,
} from './play-mode.types';
import { LearningPathService } from '../core/services/learning-path.service';
import type { HeroTypography } from '../core/services/app-settings.service';
import { AppSettingsService } from '../core/services/app-settings.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { LocaleService } from '../core/services/locale.service';
import { DisplayTextService } from '../core/services/display-text.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { PlaySessionService } from '../core/services/play-session.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { ensurePlaySessionAccess } from '../core/utils/play-access';
import { environment } from '../../environments/environment';

export type PlayDockLevel = 'categories' | 'modes';

export type PlayDockPhase = 'idle' | 'exit' | 'enter';

const DOCK_TRANSITION_MS = 280;

interface PlayRefreshSnapshot {
  subscribed: boolean;
  dailyDone: number;
  dailyTarget: number;
  freeGamesLeft: number;
  atGameLimit: boolean;
  dockLevel: PlayDockLevel;
  selectedCategoryId: PlayCategoryId | null;
  categoryIds: string;
}

@Component({
  selector: 'app-play',
  templateUrl: './play.page.html',
  styleUrls: ['./play.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayPage implements OnInit, ViewWillEnter {
  @ViewChild('dockStrip') private dockStripRef?: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly locale = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly courseLaunch = inject(CourseLaunchService);
  private readonly learningPath = inject(LearningPathService);
  private readonly displayText = inject(DisplayTextService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  readonly sub = inject(SubscriptionService);
  readonly sessionAccess = inject(SessionAccessService);

  readonly freeGamesLimit = environment.freeGamesLimit;

  heroTitleDisplay = '';
  heroSubShortDisplay = '';
  heroTypography: HeroTypography = 'comfortable';
  dailyDone = 0;
  dailyTarget = 5;
  dailyComplete = false;
  dailyProgressPercent = 0;
  freeCountryCount = 30;
  freeGamesLeft = environment.freeGamesLimit;
  atGameLimit = false;

  dockLevel: PlayDockLevel = 'categories';
  dockPhase: PlayDockPhase = 'idle';
  playCategories: PlayCategorySlide[] = [];
  recallCategory: PlayCategorySlide | null = null;
  categoryModes: PlayModeSlide[] = [];
  selectedCategory: PlayCategorySlide | null = null;
  activeSlideIndex = 0;

  private dockScrollRaf: number | null = null;
  private lastRefreshSnapshot: PlayRefreshSnapshot | null = null;

  ngOnInit(): void {
    void this.refresh();
  }

  ionViewWillEnter(): void {
    void this.refresh({ fromViewEnter: true });
  }

  get dockSliderAriaKey(): string {
    return this.dockLevel === 'categories'
      ? 'play.categoriesSliderAria'
      : 'play.modesSliderAria';
  }

  get dockItemCount(): number {
    return this.dockLevel === 'categories'
      ? this.dockCategoryItems.length
      : this.categoryModes.length;
  }

  get dockCategoryItems(): PlayCategorySlide[] {
    if (!this.recallCategory) {
      return this.playCategories;
    }
    return [...this.playCategories, this.recallCategory];
  }

  trackDockCategory(_index: number, category: PlayCategorySlide): string {
    return category.id;
  }

  trackDockMode(_index: number, mode: PlayModeSlide): string {
    return mode.id;
  }

  isCategoryLocked(category: PlayCategorySlide): boolean {
    return category.premiumLocked === true;
  }

  isModeLocked(mode: PlayModeSlide): boolean {
    return (
      (mode.action.type === 'globe' ||
        mode.action.type === 'map' ||
        mode.action.type === 'explore_mark') &&
      !this.sub.isSubscribed()
    );
  }

  onDockStripScroll(): void {
    this.ngZone.runOutsideAngular(() => {
      if (this.dockScrollRaf !== null) {
        cancelAnimationFrame(this.dockScrollRaf);
      }
      this.dockScrollRaf = requestAnimationFrame(() => {
        this.dockScrollRaf = null;
        const previousIndex = this.activeSlideIndex;
        this.syncActiveIndexFromStripScroll();
        if (previousIndex !== this.activeSlideIndex) {
          this.ngZone.run(() => this.cdr.markForCheck());
        }
      });
    });
  }

  onDockCategoryClick(index: number, category: PlayCategorySlide): void {
    if (index !== this.activeSlideIndex) {
      this.scrollDockToIndex(index);
      return;
    }
    void this.onCategoryTap(category);
  }

  onDockModeClick(index: number, mode: PlayModeSlide): void {
    if (index !== this.activeSlideIndex) {
      this.scrollDockToIndex(index);
      return;
    }
    void this.launchMode(mode);
  }

  async refresh(options?: { fromViewEnter?: boolean }): Promise<void> {
    await this.sub.init();
    await this.sessionAccess.hydrate();
    await this.displayText.ensureLoaded();
    this.heroTitleDisplay = this.displayText.effective('home.heroTitle');
    this.heroSubShortDisplay = this.displayText.effective('home.heroSubShort');
    const settings = await this.appSettings.load();
    this.heroTypography = settings.heroTypography;
    const goal = await this.dailyGoal.syncFromLearning();
    this.dailyDone = goal.progress;
    this.dailyTarget = goal.target;
    this.dailyComplete = goal.progress >= goal.target;
    this.dailyProgressPercent =
      this.dailyTarget > 0
        ? Math.min(100, Math.round((this.dailyDone / this.dailyTarget) * 100))
        : 0;
    const free = await this.playPool.getFreePool();
    this.freeCountryCount = free.length;
    this.freeGamesLeft = this.sessionAccess.remainingFreeGames(this.sub.isSubscribed());
    this.atGameLimit =
      !this.sub.isSubscribed() && !this.sessionAccess.canStartGame(false);

    const subscribed = this.sub.isSubscribed();
    const snapshot: PlayRefreshSnapshot = {
      subscribed,
      dailyDone: this.dailyDone,
      dailyTarget: this.dailyTarget,
      freeGamesLeft: this.freeGamesLeft,
      atGameLimit: this.atGameLimit,
      dockLevel: this.dockLevel,
      selectedCategoryId: this.selectedCategory?.id ?? null,
      categoryIds: this.playCategories.map((c) => c.id).join(','),
    };
    if (
      options?.fromViewEnter &&
      this.lastRefreshSnapshot &&
      this.refreshSnapshotsEqual(this.lastRefreshSnapshot, snapshot)
    ) {
      this.cdr.markForCheck();
      return;
    }

    const modesByCategory = buildPlayModesByCategory(
      subscribed,
      this.courseLaunch.launches,
    );
    const { wheel, recall } = buildPlayCategories(modesByCategory, subscribed);
    this.playCategories = wheel;
    this.recallCategory = recall;
    snapshot.categoryIds = wheel.map((c) => c.id).join(',');

    if (this.dockLevel === 'modes' && this.selectedCategory) {
      this.categoryModes = modesByCategory[this.selectedCategory.id] ?? [];
      this.activeSlideIndex = Math.min(
        this.activeSlideIndex,
        Math.max(0, this.categoryModes.length - 1),
      );
    } else {
      this.dockLevel = 'categories';
      this.selectedCategory = null;
      this.categoryModes = [];
      this.activeSlideIndex = Math.min(
        this.activeSlideIndex,
        Math.max(0, this.dockCategoryItems.length - 1),
      );
    }
    this.lastRefreshSnapshot = snapshot;
    this.syncDockScrollPosition(false);
    this.cdr.markForCheck();
  }

  private refreshSnapshotsEqual(
    a: PlayRefreshSnapshot,
    b: PlayRefreshSnapshot,
  ): boolean {
    return (
      a.subscribed === b.subscribed &&
      a.dailyDone === b.dailyDone &&
      a.dailyTarget === b.dailyTarget &&
      a.freeGamesLeft === b.freeGamesLeft &&
      a.atGameLimit === b.atGameLimit &&
      a.dockLevel === b.dockLevel &&
      a.selectedCategoryId === b.selectedCategoryId &&
      a.categoryIds === b.categoryIds
    );
  }

  private scrollDockToIndex(index: number, smooth = true): void {
    const el = this.dockStripRef?.nativeElement;
    if (!el || index < 0 || index >= el.children.length) {
      this.activeSlideIndex = index;
      this.cdr.markForCheck();
      return;
    }
    const card = el.children[index] as HTMLElement;
    card.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: smooth ? 'smooth' : 'auto',
    });
    this.activeSlideIndex = index;
    this.cdr.markForCheck();
  }

  private syncDockScrollPosition(smooth = false): void {
    queueMicrotask(() => {
      this.scrollDockToIndex(this.activeSlideIndex, smooth);
    });
  }

  private syncActiveIndexFromStripScroll(): void {
    const el = this.dockStripRef?.nativeElement;
    if (!el || el.children.length === 0) {
      return;
    }
    const center = el.scrollLeft + el.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < el.children.length; i += 1) {
      const child = el.children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(center - childCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    this.activeSlideIndex = bestIndex;
  }

  async onCategoryTap(category: PlayCategorySlide): Promise<void> {
    if (this.dockLevel !== 'categories' || this.dockPhase !== 'idle') {
      return;
    }
    if (category.premiumLocked) {
      void this.router.navigate(['/paywall']);
      return;
    }
    await this.openCategory(category);
  }

  async backToCategories(): Promise<void> {
    if (this.dockLevel !== 'modes' || this.dockPhase !== 'idle') {
      return;
    }
    await this.runDockTransition(() => {
      this.dockLevel = 'categories';
      this.selectedCategory = null;
      this.categoryModes = [];
      this.activeSlideIndex = 0;
      this.syncDockScrollPosition(false);
    });
  }

  async launchMode(slide: PlayModeSlide): Promise<void> {
    if (this.dockLevel !== 'modes' || this.dockPhase !== 'idle') {
      return;
    }

    playDebug('PlayHub', 'launchMode', { id: slide.id, action: slide.action });

    const courseLaunch =
      slide.action.type === 'course_challenge'
        ? this.courseLaunch.getLaunch(slide.action.launchId)
        : undefined;
    const launch = resolvePlayModeLaunch(slide.action, {
      isSubscribed: this.sub.isSubscribed(),
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
      const pool = await this.playPool.getFreePool();
      this.playSession.clear();
      this.playSession.setPool(pool);
      this.playSession.setMeta({ kind: 'default' });
    } else if (slide.action.type === 'recall_challenge') {
      const learned = await this.playPool.getLearnedCountries();
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
        pool = await this.playPool.getFreePool();
      }
      if (pool.length < 2) {
        await this.presentRecallEmptyAlert('course.emptyPool');
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

  openPaywall(): void {
    void this.router.navigate(['/paywall']);
  }

  private async openCategory(category: PlayCategorySlide): Promise<void> {
    const modes =
      buildPlayModesByCategory(this.sub.isSubscribed(), this.courseLaunch.launches)[
        category.id
      ] ?? [];
    await this.runDockTransition(() => {
      this.selectedCategory = category;
      this.dockLevel = 'modes';
      this.categoryModes = modes;
      this.activeSlideIndex = 0;
      this.syncDockScrollPosition(false);
    });
  }

  private async runDockTransition(swap: () => void): Promise<void> {
    this.dockPhase = 'exit';
    this.cdr.markForCheck();
    await this.wait(DOCK_TRANSITION_MS);
    swap();
    this.dockPhase = 'enter';
    this.cdr.markForCheck();
    await this.wait(DOCK_TRANSITION_MS);
    this.dockPhase = 'idle';
    this.cdr.markForCheck();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
