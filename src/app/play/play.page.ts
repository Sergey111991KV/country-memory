import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';

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
import { PerfLogService } from '../core/services/perf-log.service';
import { ensurePlaySessionAccess } from '../core/utils/play-access';
import {
  buildPlayDockWheelSlots,
  nearestPlayDockSlotIndex,
  playDockFocusFromAngle,
  playDockMiddleSlotIndex,
  resolvePlayDockSnapWheel,
  snapPlayDockSlotIndex,
  type PlayDockWheelSlot,
} from '../core/utils/play-dock-arc';
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
export class PlayPage implements OnInit, ViewWillEnter, ViewWillLeave {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  protected readonly locale = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly courseLaunch = inject(CourseLaunchService);
  private readonly learningPath = inject(LearningPathService);
  private readonly displayText = inject(DisplayTextService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  readonly sub = inject(SubscriptionService);
  readonly sessionAccess = inject(SessionAccessService);
  private readonly perf = inject(PerfLogService);

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
  /** False when leaving Play tab so the dock cannot cover other tabs. */
  showModeDock = false;
  playCategories: PlayCategorySlide[] = [];
  recallCategory: PlayCategorySlide | null = null;
  categoryModes: PlayModeSlide[] = [];
  selectedCategory: PlayCategorySlide | null = null;
  activeSlideIndex = 0;

  playDockWheelSlots: PlayDockWheelSlot[] = [];
  playDockFocusedSlotIndex = 0;
  playDockWheelDeg = 0;
  playDockDragging = false;
  playDockDragArmed = false;
  playDockAnimating = false;

  private playDockDragStartX = 0;
  private playDockDragStartWheelDeg = 0;
  private playDockTapSlotIndex: number | null = null;
  private playDockDragRaf: number | null = null;
  private lastRefreshSnapshot: PlayRefreshSnapshot | null = null;

  ngOnInit(): void {
    this.rebuildPlayDockWheel();
    this.snapPlayDockToLogical(0, false);
    void this.refresh();
  }

  ionViewWillEnter(): void {
    this.showModeDock = true;
    this.cdr.markForCheck();
    void this.refresh({ fromViewEnter: true });
  }

  ionViewWillLeave(): void {
    this.showModeDock = false;
    this.cdr.markForCheck();
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

  get playDockTileCount(): number {
    return this.dockLevel === 'categories'
      ? this.dockCategoryItems.length
      : this.categoryModes.length;
  }

  get canStepPlayDock(): boolean {
    return this.dockPhase === 'idle' && this.playDockTileCount > 1;
  }

  trackPlayDockSlot(_index: number, slot: PlayDockWheelSlot): number {
    return slot.slotIndex;
  }

  playDockSpokeTransform(slotIndex: number): string {
    const angle = this.playDockWheelSlots[slotIndex]?.angle ?? 0;
    return `rotate(${angle}deg) translateY(calc(-1 * var(--play-arc-radius) + var(--play-arc-spoke-lift, -20px)))`;
  }

  playDockSlotFocus(slotIndex: number): number {
    const angle =
      (this.playDockWheelSlots[slotIndex]?.angle ?? 0) + this.playDockWheelDeg;
    return playDockFocusFromAngle(angle);
  }

  playDockCardTransform(slotIndex: number): string {
    const angle =
      (this.playDockWheelSlots[slotIndex]?.angle ?? 0) + this.playDockWheelDeg;
    const slot = this.playDockWheelSlots[slotIndex];
    const focus = playDockFocusFromAngle(angle);
    const isLogicalCenter = slot?.logicalIndex === this.activeSlideIndex;
    const scale = isLogicalCenter && focus > 0.45 ? 1 : 0.76 + focus * 0.12;
    return `rotate(${-angle}deg) scale(${scale.toFixed(3)})`;
  }

  playDockIsActiveSlot(slotIndex: number): boolean {
    return this.playDockSlotFocus(slotIndex) > 0.45;
  }

  playDockSpokeZIndex(slotIndex: number): number {
    return Math.round(10 + this.playDockSlotFocus(slotIndex) * 90);
  }

  private resolvePlayDockSlotIndex(event: PointerEvent): number | null {
    if (!(event.target instanceof Element)) {
      return null;
    }
    const el = event.target.closest('[data-slot-index]');
    if (!el) {
      return null;
    }
    const index = Number(el.getAttribute('data-slot-index'));
    return Number.isFinite(index) ? index : null;
  }

  onPlayDockPointerDown(event: PointerEvent): void {
    if (this.dockPhase !== 'idle' || this.playDockTileCount < 2) {
      playDebug('PlayDock', 'pointerdown ignored', {
        phase: this.dockPhase,
        tiles: this.playDockTileCount,
      });
      return;
    }
    this.playDockDragArmed = true;
    this.playDockDragStartX = event.clientX;
    this.playDockDragStartWheelDeg = this.playDockWheelDeg;
    this.playDockTapSlotIndex = this.resolvePlayDockSlotIndex(event);
    playDebug('PlayDock', 'pointerdown', {
      slot: this.playDockTapSlotIndex,
      dockLevel: this.dockLevel,
    });
  }

  onPlayDockPointerMove(event: PointerEvent): void {
    if (!this.playDockDragArmed && !this.playDockDragging) {
      return;
    }
    const deltaX = event.clientX - this.playDockDragStartX;
    if (!this.playDockDragging) {
      if (Math.abs(deltaX) < 8) {
        return;
      }
      const target = event.currentTarget;
      if (target instanceof HTMLElement) {
        target.setPointerCapture(event.pointerId);
      }
      this.playDockDragging = true;
      this.playDockTapSlotIndex = null;
      playDebug('PlayDock', 'drag start', { deltaX });
    }
    this.playDockWheelDeg = this.playDockDragStartWheelDeg + deltaX * 0.38;
    this.updatePlayDockFocusedSlot();
    this.schedulePlayDockDragCheck();
  }

  onPlayDockPointerEnd(event: PointerEvent): void {
    if (!this.playDockDragArmed && !this.playDockDragging) {
      return;
    }
    this.playDockDragArmed = false;
    this.cancelPlayDockDragCheck();
    const target = event.currentTarget;
    if (target instanceof HTMLElement && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    if (this.playDockDragging) {
      this.playDockDragging = false;
      const dragDelta = this.playDockWheelDeg - this.playDockDragStartWheelDeg;
      const snappedSlot = snapPlayDockSlotIndex(
        this.playDockWheelSlots,
        this.playDockWheelDeg,
        dragDelta,
        this.playDockTileCount,
      );
      playDebug('PlayDock', 'drag end snap', {
        dragDelta,
        snappedSlot,
        logicalIndex: this.playDockWheelSlots[snappedSlot]?.logicalIndex,
      });
      this.snapPlayDockToSlot(snappedSlot);
      this.cdr.markForCheck();
      return;
    }

    const tapSlot = this.playDockTapSlotIndex;
    this.playDockTapSlotIndex = null;
    if (tapSlot !== null) {
      playDebug('PlayDock', 'tap', { slot: tapSlot });
      this.onPlayDockCardClick(tapSlot);
    }
  }

  onPlayDockCardClick(slotIndex: number): void {
    if (this.playDockAnimating || this.playDockDragging) {
      playDebug('PlayDock', 'cardClick ignored', {
        slotIndex,
        animating: this.playDockAnimating,
        dragging: this.playDockDragging,
      });
      return;
    }
    const slot = this.playDockWheelSlots[slotIndex];
    if (!slot) {
      playDebug('PlayDock', 'cardClick ignored', { slotIndex, reason: 'missing slot' });
      return;
    }
    const focus = this.playDockSlotFocus(slotIndex);
    playDebug('PlayDock', 'cardClick', {
      slotIndex,
      logicalIndex: slot.logicalIndex,
      focus,
      activeSlideIndex: this.activeSlideIndex,
      dockLevel: this.dockLevel,
    });
    if (focus <= 0.45) {
      playDebug('PlayDock', 'snap to logical', { logicalIndex: slot.logicalIndex });
      this.snapPlayDockToLogical(slot.logicalIndex);
      this.cdr.markForCheck();
      return;
    }
    if (this.dockLevel === 'categories') {
      const category = this.dockCategoryItems[slot.logicalIndex];
      if (category) {
        playDebug('PlayDock', 'open category', { id: category.id });
        void this.onCategoryTap(category);
      }
      return;
    }
    const mode = this.categoryModes[slot.logicalIndex];
    if (mode) {
      playDebug('PlayDock', 'launch mode', { id: mode.id });
      void this.launchMode(mode);
    }
  }

  playDockIsLocked(slot: PlayDockWheelSlot): boolean {
    if (this.dockLevel === 'categories') {
      return this.playDockCategory(slot)?.premiumLocked === true;
    }
    const mode = this.playDockMode(slot);
    if (!mode) {
      return false;
    }
    return (
      (mode.action.type === 'globe' ||
        mode.action.type === 'map' ||
        mode.action.type === 'explore_mark') &&
      !this.sub.isSubscribed()
    );
  }

  playDockCategory(slot: PlayDockWheelSlot): PlayCategorySlide | null {
    return this.dockCategoryItems[slot.logicalIndex] ?? null;
  }

  playDockMode(slot: PlayDockWheelSlot): PlayModeSlide | null {
    return this.categoryModes[slot.logicalIndex] ?? null;
  }

  stepPlayDock(direction: -1 | 1): void {
    if (!this.canStepPlayDock) {
      playDebug('PlayDock', 'step ignored', { direction, canStep: false });
      return;
    }
    const count = this.playDockTileCount;
    const next = (this.activeSlideIndex + direction + count) % count;
    playDebug('PlayDock', 'step', { direction, from: this.activeSlideIndex, to: next });
    this.snapPlayDockToLogical(next, true);
    this.cdr.markForCheck();
  }

  async refresh(options?: { fromViewEnter?: boolean }): Promise<void> {
    const span = this.perf.span('PlayHub', 'refresh');
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
      span.end({ skipped: true, reason: 'snapshot' });
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
    this.rebuildPlayDockWheel();
    this.snapPlayDockToLogical(this.activeSlideIndex, false);
    this.cdr.markForCheck();
    span.end({
      skipped: false,
      dockLevel: this.dockLevel,
      tiles: this.playDockTileCount,
      slots: this.playDockWheelSlots.length,
    });
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
      this.rebuildPlayDockWheel();
      this.snapPlayDockToLogical(0, false);
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
      this.rebuildPlayDockWheel();
      this.snapPlayDockToLogical(0, false);
    });
  }

  private rebuildPlayDockWheel(): void {
    const count = this.playDockTileCount;
    this.playDockWheelSlots = buildPlayDockWheelSlots(count);
    if (count > 0) {
      this.playDockFocusedSlotIndex = playDockMiddleSlotIndex(
        Math.min(this.activeSlideIndex, count - 1),
        count,
      );
    } else {
      this.playDockFocusedSlotIndex = 0;
    }
  }

  private updatePlayDockFocusedSlot(): void {
    this.playDockFocusedSlotIndex = nearestPlayDockSlotIndex(
      this.playDockWheelSlots,
      this.playDockWheelDeg,
      this.playDockTileCount,
    );
    const slot = this.playDockWheelSlots[this.playDockFocusedSlotIndex];
    if (slot) {
      this.activeSlideIndex = slot.logicalIndex;
    }
  }

  private snapPlayDockToLogical(logicalIndex: number, animate = true): void {
    const slotIndex = playDockMiddleSlotIndex(logicalIndex, this.playDockTileCount);
    this.snapPlayDockToSlot(slotIndex, animate);
  }

  private snapPlayDockToSlot(slotIndex: number, animate = true): void {
    const slot = this.playDockWheelSlots[slotIndex];
    if (!slot) {
      return;
    }
    if (animate) {
      this.beginPlayDockSnap();
    }
    const middleSlotIndex = playDockMiddleSlotIndex(
      slot.logicalIndex,
      this.playDockTileCount,
    );
    this.playDockWheelDeg = resolvePlayDockSnapWheel(
      this.playDockWheelSlots,
      middleSlotIndex,
      this.playDockWheelDeg,
      this.playDockTileCount,
    );
    this.playDockFocusedSlotIndex = middleSlotIndex;
    this.activeSlideIndex = slot.logicalIndex;

    if (!animate) {
      this.playDockDragging = true;
      queueMicrotask(() => {
        this.playDockDragging = false;
        this.cdr.markForCheck();
      });
    }
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

  private schedulePlayDockDragCheck(): void {
    if (this.playDockDragRaf !== null) {
      return;
    }
    this.playDockDragRaf = requestAnimationFrame(() => {
      this.playDockDragRaf = null;
      this.cdr.markForCheck();
    });
  }

  private cancelPlayDockDragCheck(): void {
    if (this.playDockDragRaf === null) {
      return;
    }
    cancelAnimationFrame(this.playDockDragRaf);
    this.playDockDragRaf = null;
  }

  private beginPlayDockSnap(): void {
    this.playDockAnimating = true;
    window.setTimeout(() => {
      this.playDockAnimating = false;
      this.cdr.markForCheck();
    }, 560);
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
