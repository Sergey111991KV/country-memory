import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  ViewDidEnter,
  ViewWillLeave,
} from '@ionic/angular';
import type { Object3D } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { Country, CountryProfileField } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LocaleService } from '../../core/services/locale.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import {
  GLOBE_BUMP_TEXTURE,
  type GlobeCountryFeature,
  type GlobePolygonColorState,
  iso2FromNaturalEarth,
  politicalCapColor,
  politicalStrokeColor,
} from '../../core/utils/globe-geo';
import { countryFeatureFromObject } from '../../core/utils/globe-pick';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { CountryKnowledgeService } from '../../core/services/country-knowledge.service';
import { CountryCultureModalService } from '../../core/services/country-culture-modal.service';
import { GeoJsonCacheService } from '../../core/services/geo-json-cache.service';
import { PerfLogService } from '../../core/services/perf-log.service';
import {
  globeFeatureBBoxSpanKm,
  globeFlyAltitude,
  globeRevealMinControlDistance,
} from '../../core/utils/globe-fly-altitude';
import { ensurePlaySessionAccess, ensurePremiumPlayAccess } from '../../core/utils/play-access';
import { ensureThreeGlobal } from '../../core/utils/three-global';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';
import { GlobeRenderLoop } from '../../core/utils/globe-render-loop';
import { refreshGlobePolygonColors } from '../../core/utils/globe-polygon-colors';
import { VisualQualityService } from '../../core/services/visual-quality.service';
import { GlobeThemeService } from '../../core/services/globe-theme.service';
import type { GlobeThemeId, GlobeThemePalette } from '../../core/data/globe-theme';
import { globePreviewPalette } from '../../core/data/globe-theme';
import {
  DailyCountryService,
  type DailyCountryState,
  type DailyStreak,
} from '../../core/services/daily-country.service';
import { NeighborsService } from '../../core/services/neighbors.service';
import { pickDaily } from '../../core/utils/daily-seed';
import {
  type LngLat,
  bearingDeg,
  compassArrow,
  heatColor,
  heatEmoji,
  minPointSetDistanceKm,
  proximityPercent,
  sampleGeometryPoints,
} from '../../core/utils/geo-distance';
import type { GlobeGameVariant } from '../play-mode.types';

type ThreeNamespace = typeof import('three');
type ThreeGlobeApi = Object3D & {
  globeImageUrl: (url: string) => ThreeGlobeApi;
  bumpImageUrl: (url: string) => ThreeGlobeApi;
  polygonsData: (data: GlobeCountryFeature[]) => ThreeGlobeApi;
  polygonCapColor: (fn: (f: GlobeCountryFeature) => string) => ThreeGlobeApi;
  polygonSideColor: (fn: () => string) => ThreeGlobeApi;
  polygonStrokeColor: (fn: (f: GlobeCountryFeature) => string) => ThreeGlobeApi;
  polygonAltitude: (fn: () => number) => ThreeGlobeApi;
  polygonCapCurvatureResolution: (n: number) => ThreeGlobeApi;
  polygonsTransitionDuration: (ms: number) => ThreeGlobeApi;
  showAtmosphere: (show: boolean) => ThreeGlobeApi;
  onGlobeReady: (fn: () => void) => ThreeGlobeApi;
  getCoords: (lat: number, lng: number, altitude?: number) => { x: number; y: number; z: number };
  setPointOfView: (camera: import('three').Camera) => void;
};

type PickPhase = 'pick' | 'feedback';

const ROUNDS_PER_SESSION = 10;
const POLYGON_ALTITUDE = 0.022;
const ORBIT_MIN_DISTANCE_PLAY = 180;
const ORBIT_MIN_DISTANCE_PREVIEW = 78;
const ORBIT_MAX_DISTANCE = 480;
const ZOOM_STEP = 0.82;

interface GlobeFlyOptions {
  reveal?: boolean;
  /** Look at these coordinates instead of the country (keeps the answer off-centre). */
  viewFrom?: { lat: number; lng: number };
  /** Explicit relative altitude (overrides the round / reveal presets). */
  altitude?: number;
}

/** One hot/cold guess as shown in the list. */
export interface HotColdGuessView {
  iso2: string;
  label: string;
  km: number;
  arrow: string;
  percent: number;
  color: string;
  correct: boolean;
}

/** Countries smaller than this are skipped as hot/cold & daily answers (too hard to see). */
const MYSTERY_MIN_AREA_KM2 = 20_000;
const MAX_SUGGESTIONS = 6;
/** Neutral "game board" land colour for hot/cold and neighbours. */
const GAME_BOARD_FILL = 'rgba(203, 213, 225, 0.94)';
/** Target highlight in the neighbours game (distinct from every continent colour). */
const NEIGHBOR_TARGET_FILL = 'rgba(245, 158, 11, 0.96)';

@Component({
  selector: 'app-globe-find',
  templateUrl: './globe-find.page.html',
  styleUrls: ['./globe-find.page.scss'],
  standalone: false,
})
export class GlobeFindPage implements OnDestroy, ViewWillLeave, ViewDidEnter {
  @ViewChild('globeHost')
  private globeHost?: ElementRef<HTMLDivElement>;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly playSession = inject(PlaySessionService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly ngZone = inject(NgZone);
  private readonly perf = inject(PerfLogService);
  private readonly geoCache = inject(GeoJsonCacheService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly cultureModal = inject(CountryCultureModalService);
  private readonly visualQuality = inject(VisualQualityService);
  private readonly globeTheme = inject(GlobeThemeService);
  private readonly dailyCountry = inject(DailyCountryService);
  private readonly neighbors = inject(NeighborsService);

  /** Hot/cold: guesses sorted closest-first, plus the chronological log. */
  hotGuesses: HotColdGuessView[] = [];
  private guessLog: HotColdGuessView[] = [];
  lastGuessIso: string | null = null;
  guessQuery = '';
  guessSuggestions: { iso2: string; label: string }[] = [];
  dailyState: DailyCountryState | null = null;
  dailyStreak: DailyStreak | null = null;
  /** Neighbours game: land borders of the highlighted target. */
  neighborIsos: string[] = [];
  private readonly customFills = new Map<string, string>();
  private forceFullColorRefresh = false;
  private readonly borderPoints = new Map<string, LngLat[]>();

  loading = true;
  loadError = false;
  /** Lookup / browse mode (query ?focus=ISO or ?browse=1) — no scoring session. */
  previewMode = false;
  /** Preview without a pre-selected country (Knowledge → Open globe). */
  browseMode = false;
  /** Game variant from the `;variant=` matrix param ('find' = classic Globe Quest). */
  variant: GlobeGameVariant | 'find' = 'find';
  identifyChoices: { iso2: string; label: string }[] = [];
  backToKnowledge = false;
  target: Country | null = null;
  selectedIso: string | null = null;
  phase: PickPhase = 'pick';
  feedbackCorrect = false;
  round = 1;

  private playable: Country[] = [];
  private geoFeatures: GlobeCountryFeature[] = [];
  private globe: Object3D | null = null;
  private threeLib: ThreeNamespace | null = null;
  private renderer: import('three').WebGLRenderer | null = null;
  private camera: import('three').PerspectiveCamera | null = null;
  private scene: import('three').Scene | null = null;
  private controls: OrbitControls | null = null;
  private bootStarted = false;
  private renderLoop: GlobeRenderLoop | null = null;
  private flyRafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private lastPolygonStyleKey = '';
  private polygonColorsDirty = false;
  private polygonColorDirtyIsos: Set<string> | null = null;
  private lastColorSelectedIso: string | null = null;
  private lastColorFeedbackCorrectIso: string | null = null;
  private lastColorFeedbackWrongIso: string | null = null;
  private readonly polygonStyleState: GlobePolygonColorState = {
    selectedIso: null,
    feedbackCorrectIso: null,
    feedbackWrongIso: null,
    phase: 'pick',
  };
  private themePalette: GlobeThemePalette = this.globeTheme.palette();
  private appliedGlobeTheme: GlobeThemeId | null = null;
  private readonly capColorFn = (f: GlobeCountryFeature): string =>
    politicalCapColor(f, this.polygonStyleState, this.activePalette());
  private readonly strokeColorFn = (f: GlobeCountryFeature): string =>
    politicalStrokeColor(f, this.polygonStyleState, this.activePalette());
  private readonly onVisibilityChange = (): void => {
    const hidden = document.hidden;
    this.renderLoop?.setPaused(hidden);
  };
  private feedbackCorrectIso: string | null = null;
  private feedbackWrongIso: string | null = null;
  private raycaster: import('three').Raycaster | null = null;
  private pointerNdc: import('three').Vector2 | null = null;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private readonly onCanvasPointerDown = (ev: PointerEvent): void => {
    this.pointerDownX = ev.clientX;
    this.pointerDownY = ev.clientY;
  };
  private readonly onCanvasPointerUp = (ev: PointerEvent): void => {
    const dx = ev.clientX - this.pointerDownX;
    const dy = ev.clientY - this.pointerDownY;
    if (dx * dx + dy * dy > 36) {
      return;
    }
    this.pickCountryAtPointer(ev.clientX, ev.clientY);
  };
  readonly roundsTotal = ROUNDS_PER_SESSION;

  constructor() {
    effect(() => {
      const themeId = this.globeTheme.theme();
      if (this.globe && themeId !== this.appliedGlobeTheme) {
        this.applyGlobeTheme(themeId);
      }
    });
  }

  ionViewDidEnter(): void {
    if (this.bootStarted) {
      this.syncGlobeTheme();
      this.renderLoop?.setPaused(false);
      this.renderLoop?.requestRender();
      return;
    }
    const variant = this.route.snapshot.paramMap.get('variant');
    this.variant =
      variant === 'identify' ||
      variant === 'hotcold' ||
      variant === 'neighbors' ||
      variant === 'daily'
        ? variant
        : 'find';
    const params = this.route.snapshot.queryParamMap;
    this.backToKnowledge = (params.get('from') ?? '').toLowerCase() === 'knowledge';
    const focusIso = (params.get('focus') ?? '').trim().toUpperCase();
    const browse =
      params.get('browse') === '1' ||
      (this.backToKnowledge && focusIso.length !== 2);
    if (focusIso.length === 2) {
      void this.startPreview(focusIso);
      return;
    }
    if (browse) {
      void this.startBrowse();
      return;
    }
    void this.startSession();
  }

  private async startPreview(iso2: string): Promise<void> {
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    this.previewMode = true;
    this.browseMode = false;
    await this.bootPreview(iso2);
  }

  private async startBrowse(): Promise<void> {
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    this.previewMode = true;
    this.browseMode = true;
    await this.bootBrowse();
  }

  private async startSession(): Promise<void> {
    if (this.variant === 'daily') {
      // The daily country is free for everyone and does not use a game slot.
      if (this.bootStarted) {
        return;
      }
      this.bootStarted = true;
      await this.boot();
      return;
    }
    if (!(await ensurePremiumPlayAccess(this.subscription, this.router))) {
      this.loading = false;
      return;
    }
    const allowed = await ensurePlaySessionAccess(
      this.subscription,
      this.sessionAccess,
      this.router,
    );
    if (!allowed) {
      this.loading = false;
      return;
    }
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    await this.boot();
  }

  ionViewWillLeave(): void {
    // Pause (don't destroy) so the globe renders again when Ionic re-enters the cached page.
    this.cancelFlyAnimation();
    this.renderLoop?.setPaused(true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.cancelFlyAnimation();
    this.renderLoop?.stop();
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onCanvasPointerDown);
      canvas.removeEventListener('pointerup', this.onCanvasPointerUp);
    }
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    if (this.globeHost?.nativeElement && this.renderer?.domElement) {
      this.globeHost.nativeElement.removeChild(this.renderer.domElement);
    }
  }

  get targetLabel(): string {
    if (!this.target) {
      return '';
    }
    return this.catalog.localizedName(this.target, this.locale.language);
  }

  get canVerify(): boolean {
    return this.phase === 'pick' && this.selectedIso !== null;
  }

  get showFeedback(): boolean {
    return this.phase === 'feedback';
  }

  async verify(): Promise<void> {
    if (!this.target || !this.selectedIso) {
      const t = await this.toastCtrl.create({
        message: this.locale.translate('globe.needPick'),
        duration: 1600,
      });
      await t.present();
      return;
    }
    const correct = this.selectedIso === this.target.iso2;
    this.feedbackCorrect = correct;
    this.feedbackCorrectIso = this.target.iso2;
    this.feedbackWrongIso = correct ? null : this.selectedIso;
    this.phase = 'feedback';
    this.refreshPolygonColors();
    this.flyToCountry(this.target, 1100, { reveal: true });

    await this.learning.recordAttempt('globe_find', this.target.iso2, correct, false);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
  }

  get identifyMode(): boolean {
    return this.variant === 'identify';
  }

  get hotColdMode(): boolean {
    return this.variant === 'hotcold' || this.variant === 'daily';
  }

  get dailyMode(): boolean {
    return this.variant === 'daily';
  }

  get neighborsMode(): boolean {
    return this.variant === 'neighbors';
  }

  /** Round-based variants (classic, identify, neighbours) show "Round x / 10". */
  get showRoundNote(): boolean {
    return !this.previewMode && !this.hotColdMode;
  }

  get dailyNumber(): number {
    return this.dailyCountry.puzzleNumber();
  }

  get globeTitleKey(): string {
    if (this.previewMode) {
      return 'globe.previewTitle';
    }
    switch (this.variant) {
      case 'identify':
        return 'play.globeIdentifyTitle';
      case 'hotcold':
        return 'play.hotColdTitle';
      case 'daily':
        return 'play.dailyTitle';
      case 'neighbors':
        return 'play.neighborsTitle';
      default:
        return 'play.globeFindTitle';
    }
  }

  neighborNames(): string {
    const lang = this.locale.language;
    return this.neighborIsos
      .map((iso) => this.playable.find((c) => c.iso2 === iso))
      .filter((c): c is Country => Boolean(c))
      .map((c) => this.catalog.localizedName(c, lang))
      .join(', ');
  }

  trackGuess(_index: number, guess: HotColdGuessView): string {
    return guess.iso2;
  }

  formatKm(km: number): string {
    return Math.round(km).toLocaleString(this.locale.language);
  }

  // ── Hot / cold & daily ────────────────────────────────────────────

  onGuessInput(ev: CustomEvent): void {
    this.guessQuery = String(ev.detail?.value ?? '');
    const q = this.guessQuery.trim().toLowerCase();
    if (!q) {
      this.guessSuggestions = [];
      return;
    }
    const lang = this.locale.language;
    const guessed = new Set(this.guessLog.map((g) => g.iso2));
    const scored: { iso2: string; label: string; rank: number }[] = [];
    for (const c of this.playable) {
      if (guessed.has(c.iso2)) {
        continue;
      }
      const label = this.catalog.localizedName(c, lang);
      const local = label.toLowerCase();
      const en = c.names.en.toLowerCase();
      const rank = local.startsWith(q) || en.startsWith(q)
        ? 0
        : local.includes(q) || en.includes(q)
          ? 1
          : -1;
      if (rank >= 0) {
        scored.push({ iso2: c.iso2, label, rank });
      }
    }
    scored.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, lang));
    this.guessSuggestions = scored
      .slice(0, MAX_SUGGESTIONS)
      .map(({ iso2, label }) => ({ iso2, label }));
  }

  submitFirstSuggestion(): void {
    const first = this.guessSuggestions[0];
    if (first) {
      void this.submitGuess(first.iso2);
    }
  }

  async submitGuess(iso2: string): Promise<void> {
    if (!this.hotColdMode || this.phase !== 'pick' || !this.target) {
      return;
    }
    this.guessQuery = '';
    this.guessSuggestions = [];
    if (this.guessLog.some((g) => g.iso2 === iso2)) {
      await this.toast('hotcold.already');
      return;
    }
    const view = this.buildGuessView(iso2);
    if (!view) {
      return;
    }
    this.pushGuess(view);
    if (view.correct) {
      await this.finishHotCold(true);
      return;
    }
    if (this.dailyState) {
      this.dailyState.guesses.push({ iso2, km: view.km });
      await this.dailyCountry.saveState(this.dailyState);
    }
    const guessed = this.playable.find((c) => c.iso2 === iso2);
    if (guessed) {
      this.flyToCountry(guessed, 700, { altitude: 1.7 });
    }
  }

  async giveUp(): Promise<void> {
    if (!this.hotColdMode || this.phase !== 'pick') {
      return;
    }
    await this.finishHotCold(false);
  }

  /** Hot/cold: another random mystery country (not daily). */
  nextMystery(): void {
    if (this.variant !== 'hotcold') {
      return;
    }
    this.round += 1;
    this.pickNewTarget();
  }

  async shareResult(): Promise<void> {
    const text = this.buildShareText();
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ text });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      await this.toast('daily.copied');
    } catch {
      await this.toast('daily.shareFailed');
    }
  }

  private buildShareText(): string {
    const title = this.dailyMode
      ? this.locale.translate('daily.kicker', { n: this.dailyNumber })
      : this.locale.translate('play.hotColdTitle');
    const solved = this.feedbackCorrect;
    const result = solved
      ? this.locale.translate('hotcold.solved', { count: this.guessLog.length })
      : this.locale.translate('hotcold.notSolved');
    const squares = this.guessLog.map((g) => heatEmoji(g.km, g.correct)).join('');
    return `Flagfield 🌍 ${title}\n${result}\n${squares}`;
  }

  private buildGuessView(iso2: string): HotColdGuessView | null {
    const target = this.target;
    const country = this.playable.find((c) => c.iso2 === iso2);
    if (!target || !country) {
      return null;
    }
    const correct = iso2 === target.iso2;
    const km = correct || this.neighbors.areNeighbors(iso2, target.iso2)
      ? 0
      : Math.max(0, minPointSetDistanceKm(this.pointsFor(iso2), this.pointsFor(target.iso2)));
    return {
      iso2,
      label: this.catalog.localizedName(country, this.locale.language),
      km,
      arrow: correct ? '🎯' : compassArrow(bearingDeg(country.lat, country.lng, target.lat, target.lng)),
      percent: correct ? 100 : proximityPercent(km),
      color: correct ? this.activePalette().correctFill : heatColor(km),
      correct,
    };
  }

  private pushGuess(view: HotColdGuessView): void {
    this.guessLog = [...this.guessLog, view];
    this.hotGuesses = [...this.guessLog].sort((a, b) => a.km - b.km);
    this.lastGuessIso = view.iso2;
    this.customFills.set(view.iso2, view.color);
    this.applyCustomFills();
  }

  private pointsFor(iso2: string): LngLat[] {
    let pts = this.borderPoints.get(iso2);
    if (!pts) {
      const feature = this.geoFeatures.find((f) => iso2FromNaturalEarth(f.properties) === iso2);
      pts = sampleGeometryPoints(feature?.geometry);
      this.borderPoints.set(iso2, pts);
    }
    return pts;
  }

  private async finishHotCold(solved: boolean, options?: { restoring?: boolean }): Promise<void> {
    const target = this.target;
    if (!target) {
      return;
    }
    this.phase = 'feedback';
    this.feedbackCorrect = solved;
    this.customFills.set(target.iso2, this.activePalette().correctFill);
    this.applyCustomFills();
    this.flyToCountry(target, 1100, { reveal: true });
    if (options?.restoring) {
      return;
    }
    await this.learning.recordAttempt('globe_find', target.iso2, solved, false);
    if (solved) {
      await this.dailyGoal.bumpProgress();
    }
    if (!this.dailyMode) {
      await this.sessionAccess.recordCompletedGame();
    }
    if (this.dailyState) {
      if (solved) {
        this.dailyState.guesses.push({ iso2: target.iso2, km: 0 });
      }
      this.dailyStreak = await this.dailyCountry.finish(this.dailyState, solved);
    }
  }

  /** Stable list of reasonably sized countries for mystery answers. */
  private mysteryPool(): Country[] {
    const big = this.playable.filter(
      (c) => (this.knowledge.getEntry(c.iso2)?.areaKm2 ?? 0) >= MYSTERY_MIN_AREA_KM2,
    );
    const pool = big.length >= 20 ? big : this.playable;
    return [...pool].sort((a, b) => a.iso2.localeCompare(b.iso2));
  }

  private async startDaily(): Promise<void> {
    const target = pickDaily(this.mysteryPool(), this.dailyCountry.todayKey());
    if (!target) {
      throw new Error('No daily country');
    }
    this.resetRoundVisuals();
    this.target = target;
    this.dailyState = await this.dailyCountry.loadToday(target.iso2);
    await this.dailyCountry.refresh();
    this.dailyStreak = this.dailyCountry.streak();
    for (const g of this.dailyState.guesses) {
      const view = this.buildGuessView(g.iso2);
      if (view) {
        this.pushGuess(view);
      }
    }
    if (this.dailyState.status !== 'playing') {
      await this.finishHotCold(this.dailyState.status === 'solved', { restoring: true });
      return;
    }
    this.flyToCountry(target, 0, { viewFrom: this.neutralViewpoint(target) });
  }

  // ── Neighbours ─────────────────────────────────────────────────────

  async answerNeighbor(iso2: string): Promise<void> {
    const target = this.target;
    if (!this.neighborsMode || this.phase !== 'pick' || !target || iso2 === target.iso2) {
      return;
    }
    const correct = this.neighborIsos.includes(iso2);
    const palette = this.activePalette();
    this.selectedIso = iso2;
    this.feedbackCorrect = correct;
    this.phase = 'feedback';
    for (const n of this.neighborIsos) {
      this.customFills.set(n, palette.correctFill);
    }
    if (!correct) {
      this.customFills.set(iso2, palette.wrongFill);
    }
    this.applyCustomFills();

    await this.learning.recordAttempt('globe_find', target.iso2, correct, false);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
  }

  private pickNeighborsTarget(): void {
    const playableIso = new Set(this.playable.map((c) => c.iso2));
    const candidates = this.playable.filter(
      (c) => this.neighbors.neighborsOf(c.iso2).some((n) => playableIso.has(n)),
    );
    const target = candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    this.target = target;
    if (!target) {
      return;
    }
    this.neighborIsos = this.neighbors.neighborsOf(target.iso2).filter((n) => playableIso.has(n));
    this.customFills.set(target.iso2, NEIGHBOR_TARGET_FILL);
    this.applyCustomFills();
    const reveal = globeFlyAltitude({
      areaKm2: this.knowledge.getEntry(target.iso2)?.areaKm2,
      spanKm: globeFeatureBBoxSpanKm(this.featureForCountry(target), target.lat),
      reveal: true,
    });
    if (this.controls) {
      this.controls.minDistance = 120;
    }
    this.flyToCountry(target, 900, { altitude: Math.min(1.6, Math.max(0.4, reveal * 1.5)) });
  }

  // ── Shared helpers ─────────────────────────────────────────────────

  private resetRoundVisuals(): void {
    this.selectedIso = null;
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.feedbackCorrectIso = null;
    this.feedbackWrongIso = null;
    this.guessLog = [];
    this.hotGuesses = [];
    this.lastGuessIso = null;
    this.guessQuery = '';
    this.guessSuggestions = [];
    this.neighborIsos = [];
    this.customFills.clear();
    this.applyCustomFills();
    this.refreshPolygonColors();
  }

  private applyCustomFills(): void {
    this.polygonStyleState.customFills = this.customFills;
    this.polygonStyleState.baseFill =
      this.hotColdMode || this.neighborsMode ? GAME_BOARD_FILL : undefined;
    this.forceFullColorRefresh = true;
    this.polygonColorsDirty = true;
    this.renderLoop?.requestRender();
  }

  private async toast(key: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.locale.translate(key),
      duration: 1600,
      position: 'top',
    });
    await t.present();
  }

  async answerIdentify(iso2: string): Promise<void> {
    if (!this.target || this.phase !== 'pick') {
      return;
    }
    this.selectedIso = iso2;
    const correct = iso2 === this.target.iso2;
    this.feedbackCorrect = correct;
    this.feedbackCorrectIso = this.target.iso2;
    this.feedbackWrongIso = null;
    this.phase = 'feedback';
    this.refreshPolygonColors();

    await this.learning.recordAttempt('globe_find', this.target.iso2, correct, false);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
  }

  private buildIdentifyChoices(target: Country): void {
    const lang = this.locale.language;
    const sameContinent = this.playable.filter(
      (c) => c.iso2 !== target.iso2 && c.continent === target.continent,
    );
    const others = this.playable.filter(
      (c) => c.iso2 !== target.iso2 && c.continent !== target.continent,
    );
    const shuffle = <T>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
    const distractors = [...shuffle(sameContinent), ...shuffle(others)].slice(0, 3);
    this.identifyChoices = shuffle([target, ...distractors]).map((c) => ({
      iso2: c.iso2,
      label: this.catalog.localizedName(c, lang),
    }));
  }

  async nextRound(): Promise<void> {
    if (this.round >= ROUNDS_PER_SESSION) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.globeTitle',
          doneHeaderKey: 'globe.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS_PER_SESSION,
          subtitleKey: 'play.globeFindTitle',
        }),
      );
      return;
    }
    this.round += 1;
    this.pickNewTarget();
  }

  showCorrectOnGlobe(): void {
    if (!this.target) {
      return;
    }
    this.globeHost?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.flyToCountry(this.target, 1600, { reveal: true });
  }

  /** Preview: tap country name to fly back to the first reveal pose. */
  recenterOnTarget(): void {
    if (!this.previewMode || !this.target) {
      return;
    }
    this.globeHost?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.flyToCountry(this.target, 700, { reveal: true });
  }

  zoomIn(): void {
    this.nudgeCameraDistance(ZOOM_STEP);
  }

  zoomOut(): void {
    this.nudgeCameraDistance(1 / ZOOM_STEP);
  }

  goBack(): void {
    if (this.backToKnowledge) {
      void this.router.navigate(['/tabs/knowledge']);
      return;
    }
    if (this.previewMode) {
      const from = (this.route.snapshot.queryParamMap.get('from') ?? '').toLowerCase();
      if (from === 'atlas') {
        void this.router.navigate(['/tabs/play/explore-atlas']);
        return;
      }
      this.location.back();
      return;
    }
    void this.router.navigate(['/tabs/play']);
  }

  continentLabel(country: Country): string {
    return this.locale.translate(`continent.${country.continent}`);
  }

  /** Preview: key facts (capital, language, currency, population) for the focused country. */
  previewFields(country: Country): CountryProfileField[] {
    return this.knowledge.getProfileFields(country, this.locale.language);
  }

  async openCulture(): Promise<void> {
    const c = this.target;
    if (!c) {
      return;
    }
    const lang = this.locale.language;
    await this.cultureModal.open({
      iso2: c.iso2,
      countryName: this.catalog.localizedName(c, lang),
      capital: this.catalog.localizedCapital(c, lang),
      continentLabel: this.continentLabel(c),
      continentId: c.continent,
    });
  }

  explainLine(country: Country): string {
    return this.locale.translate('globe.explainLine', {
      capital: this.catalog.localizedCapital(country, this.locale.language),
      continent: this.continentLabel(country),
    });
  }

  private async bootBrowse(): Promise<void> {
    const totalSpan = this.perf.span('GlobeQuest', 'bootBrowse');
    try {
      await this.catalog.ensureLoaded();
      await this.knowledge.ensureLoaded();
      const allFeatures = await this.geoCache.getPoliticalFeatures();
      const mapIso = new Set(
        allFeatures
          .map((f) => iso2FromNaturalEarth(f.properties))
          .filter((x): x is string => Boolean(x)),
      );
      this.playable = this.catalog.filterPlayable(mapIso);
      const playableIso = new Set(this.playable.map((c) => c.iso2.toUpperCase()));
      this.geoFeatures = allFeatures.filter((f) =>
        playableIso.has(iso2FromNaturalEarth(f.properties) ?? ''),
      );
      await this.waitForGlobeHost();
      await this.initGlobe();
      this.target = null;
      this.selectedIso = null;
      this.feedbackCorrectIso = null;
      this.feedbackWrongIso = null;
      this.feedbackCorrect = false;
      this.phase = 'pick';
      this.refreshPolygonColors();
      this.loading = false;
      totalSpan.end({ playable: this.playable.length });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('Globe browse boot failed:', detail, err);
      this.loadError = true;
      this.loading = false;
      totalSpan.end({ error: detail });
    }
  }

  private async bootPreview(iso2: string): Promise<void> {
    const totalSpan = this.perf.span('GlobeQuest', 'bootPreview');
    try {
      await this.catalog.ensureLoaded();
      await this.knowledge.ensureLoaded();
      const allFeatures = await this.geoCache.getPoliticalFeatures();
      const mapIso = new Set(
        allFeatures
          .map((f) => iso2FromNaturalEarth(f.properties))
          .filter((x): x is string => Boolean(x)),
      );
      this.playable = this.catalog.filterPlayable(mapIso);
      const playableIso = new Set(this.playable.map((c) => c.iso2.toUpperCase()));
      this.geoFeatures = allFeatures.filter((f) =>
        playableIso.has(iso2FromNaturalEarth(f.properties) ?? ''),
      );
      const country =
        this.playable.find((c) => c.iso2.toUpperCase() === iso2) ?? null;
      if (!country) {
        throw new Error(`Country not found for preview: ${iso2}`);
      }
      await this.waitForGlobeHost();
      await this.initGlobe();
      this.target = country;
      this.selectedIso = country.iso2;
      this.feedbackCorrectIso = country.iso2;
      this.feedbackWrongIso = null;
      this.feedbackCorrect = true;
      this.phase = 'feedback';
      this.refreshPolygonColors();
      this.loading = false;
      this.flyToCountry(country, 0);
      queueMicrotask(() => this.flyToCountry(country, 550, { reveal: true }));
      totalSpan.end({ iso2 });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('Globe preview boot failed:', detail, err);
      this.loadError = true;
      this.loading = false;
      totalSpan.end({ error: detail });
    }
  }

  private async boot(): Promise<void> {
    const totalSpan = this.perf.span('GlobeQuest', 'boot');
    try {
      const catalogSpan = this.perf.span('GlobeQuest', 'catalog');
      await this.catalog.ensureLoaded();
      await this.knowledge.ensureLoaded();
      catalogSpan.end();
      const geoSpan = this.perf.span('GlobeQuest', 'geoJson');
      const allFeatures = await this.geoCache.getPoliticalFeatures();
      geoSpan.end({ features: allFeatures.length });
      const mapIso = new Set(
        allFeatures
          .map((f) => iso2FromNaturalEarth(f.properties))
          .filter((x): x is string => Boolean(x)),
      );
      const usesSessionPool = this.variant === 'find' || this.variant === 'identify';
      const pool = usesSessionPool ? await this.playSession.resolvePool() : [];
      const poolIso = new Set(pool.map((c) => c.iso2.toUpperCase()));
      this.playable = this.catalog
        .filterPlayable(mapIso)
        .filter((c) => !usesSessionPool || poolIso.has(c.iso2.toUpperCase()));
      if (this.neighborsMode || this.hotColdMode) {
        await this.neighbors.ensureLoaded();
      }
      const playableIso = new Set(this.playable.map((c) => c.iso2.toUpperCase()));
      this.geoFeatures = allFeatures.filter((f) =>
        playableIso.has(iso2FromNaturalEarth(f.properties)),
      );
      if (this.playable.length === 0) {
        throw new Error('No playable countries');
      }
      await this.waitForGlobeHost();
      const globeSpan = this.perf.span('GlobeQuest', 'initGlobe');
      await this.initGlobe();
      globeSpan.end({ playable: this.playable.length });
      if (this.dailyMode) {
        await this.startDaily();
      } else {
        this.pickNewTarget();
      }
      this.loading = false;
      totalSpan.end({
        playable: this.playable.length,
        geoFeatures: this.geoFeatures.length,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('Globe Quest boot failed:', detail, err);
      this.loadError = true;
      this.loading = false;
    }
  }

  private getThree(): ThreeNamespace {
    const w = window as Window & { THREE?: ThreeNamespace };
    if (!w.THREE) {
      throw new Error('THREE is not initialized');
    }
    return w.THREE;
  }

  private async waitForGlobeHost(): Promise<void> {
    for (let i = 0; i < 60; i++) {
      if (this.globeHost?.nativeElement) {
        return;
      }
      await new Promise<void>((resolve) => {
        this.ngZone.runOutsideAngular(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    }
    throw new Error('Globe host element missing');
  }

  private async initGlobe(): Promise<void> {
    if (this.globe) {
      return;
    }

    const THREE = await ensureThreeGlobal();
    this.threeLib = THREE;
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();

    const { default: ThreeGlobe } = await import('three-globe');
    const { OrbitControls: OrbitControlsCtor } =
      await import('three/examples/jsm/controls/OrbitControls.js');

    const host = this.globeHost?.nativeElement;
    if (!host) {
      throw new Error('Globe host element missing');
    }
    const width = host.clientWidth || 360;
    const height = host.clientHeight || Math.max(280, Math.round(window.innerHeight * 0.4));
    const globeCfg = this.visualQuality.profile().globe;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    this.camera.position.z = 320;

    this.renderer = new THREE.WebGLRenderer({
      antialias: globeCfg.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, globeCfg.maxPixelRatio));
    host.appendChild(this.renderer.domElement);

    const globe = new ThreeGlobe({
      animateIn: false,
      waitForGlobeReady: true,
    }) as unknown as ThreeGlobeApi;

    let globeLayer = globe
      .globeImageUrl(this.activePalette().globeTexture)
      .showAtmosphere(false);
    if (globeCfg.useBumpMap) {
      globeLayer = globeLayer.bumpImageUrl(GLOBE_BUMP_TEXTURE);
    }
    globeLayer
      .polygonsData(this.geoFeatures)
      .polygonCapColor(this.capColorFn)
      .polygonSideColor(() => this.activePalette().polygonSideColor)
      .polygonStrokeColor(this.strokeColorFn)
      .polygonAltitude(() => POLYGON_ALTITUDE)
      .polygonCapCurvatureResolution(globeCfg.polygonCurvatureDeg)
      .polygonsTransitionDuration(0)
      .onGlobeReady(() => this.renderLoop?.requestRender());

    this.scene.add(globe);
    this.globe = globe;
    this.applyGlobeTheme(this.globeTheme.theme());

    const light = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(light);
    const dir = new THREE.DirectionalLight(0xffffff, 0.65);
    dir.position.set(1, 1, 1);
    this.scene.add(dir);

    this.controls = new OrbitControlsCtor(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = this.previewMode
      ? ORBIT_MIN_DISTANCE_PREVIEW
      : ORBIT_MIN_DISTANCE_PLAY;
    this.controls.maxDistance = ORBIT_MAX_DISTANCE;
    this.controls.addEventListener('change', () => {
      const g = this.globe as ThreeGlobeApi | null;
      if (g && this.camera) {
        g.setPointOfView(this.camera);
      }
      this.renderLoop?.requestRender();
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    canvas.addEventListener('pointerup', this.onCanvasPointerUp);

    this.renderLoop = new GlobeRenderLoop(this.ngZone, () => this.drawFrame());
    this.renderLoop.start();
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
      this.renderLoop?.requestRender();
    });
    this.resizeObserver.observe(host);
    this.onResize();

    if (this.target) {
      this.flyToCountry(this.target, 0);
    }
  }

  private drawFrame(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    this.applyPolygonColorRefresh();
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    const host = this.globeHost?.nativeElement;
    if (!host) {
      return;
    }
    const width = host.clientWidth || 360;
    const height = host.clientHeight || Math.max(280, Math.round(window.innerHeight * 0.4));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private refreshPolygonColors(): void {
    const styleKey = `${this.appliedGlobeTheme}|${this.phase}|${this.selectedIso}|${this.feedbackCorrectIso}|${this.feedbackWrongIso}`;
    if (styleKey === this.lastPolygonStyleKey) {
      return;
    }
    this.lastPolygonStyleKey = styleKey;
    this.polygonStyleState.selectedIso = this.selectedIso;
    this.polygonStyleState.feedbackCorrectIso = this.feedbackCorrectIso;
    this.polygonStyleState.feedbackWrongIso = this.feedbackWrongIso;
    this.polygonStyleState.phase = this.phase;

    const dirtyIsos = new Set<string>();
    if (this.lastColorSelectedIso) {
      dirtyIsos.add(this.lastColorSelectedIso);
    }
    if (this.lastColorFeedbackCorrectIso) {
      dirtyIsos.add(this.lastColorFeedbackCorrectIso);
    }
    if (this.lastColorFeedbackWrongIso) {
      dirtyIsos.add(this.lastColorFeedbackWrongIso);
    }
    if (this.selectedIso) {
      dirtyIsos.add(this.selectedIso);
    }
    if (this.feedbackCorrectIso) {
      dirtyIsos.add(this.feedbackCorrectIso);
    }
    if (this.feedbackWrongIso) {
      dirtyIsos.add(this.feedbackWrongIso);
    }

    this.lastColorSelectedIso = this.selectedIso;
    this.lastColorFeedbackCorrectIso = this.feedbackCorrectIso;
    this.lastColorFeedbackWrongIso = this.feedbackWrongIso;

    this.polygonColorDirtyIsos = dirtyIsos.size > 0 ? dirtyIsos : null;
    this.polygonColorsDirty = true;
    this.renderLoop?.requestRender();
  }

  private applyPolygonColorRefresh(): void {
    if (!this.polygonColorsDirty || !this.globe) {
      return;
    }
    this.polygonColorsDirty = false;
    const onlyIsos = this.forceFullColorRefresh
      ? undefined
      : (this.polygonColorDirtyIsos ?? undefined);
    this.forceFullColorRefresh = false;
    refreshGlobePolygonColors(this.globe, this.polygonStyleState, {
      onlyIsos,
      palette: this.activePalette(),
    });
    this.polygonColorDirtyIsos = null;
  }

  private pickCountryAtPointer(clientX: number, clientY: number): void {
    if (
      (!this.previewMode && this.phase !== 'pick') ||
      !this.globe ||
      !this.camera ||
      !this.renderer ||
      !this.raycaster ||
      !this.pointerNdc
    ) {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.globe, true);
    for (const hit of hits) {
      const feature = countryFeatureFromObject(hit.object);
      if (feature) {
        const iso = iso2FromNaturalEarth(feature.properties);
        if (iso) {
          this.ngZone.run(() => {
            if (this.previewMode) {
              this.focusPreviewCountry(iso);
            } else if (this.hotColdMode) {
              void this.submitGuess(iso);
            } else if (this.neighborsMode) {
              void this.answerNeighbor(iso);
            } else if (!this.identifyMode) {
              this.selectedIso = iso;
              this.refreshPolygonColors();
            }
          });
        }
        return;
      }
    }
  }

  /** Preview / browse: highlight a country and animate the camera to it. */
  private focusPreviewCountry(iso: string): void {
    const country =
      this.playable.find((c) => c.iso2.toUpperCase() === iso.toUpperCase()) ?? null;
    if (!country) {
      return;
    }
    this.browseMode = false;
    this.target = country;
    this.selectedIso = country.iso2;
    this.feedbackCorrectIso = country.iso2;
    this.feedbackWrongIso = null;
    this.feedbackCorrect = true;
    this.phase = 'feedback';
    this.refreshPolygonColors();
    this.flyToCountry(country, 900, { reveal: true });
  }

  private pickNewTarget(): void {
    if (this.playable.length === 0) {
      return;
    }
    this.resetRoundVisuals();
    if (this.controls) {
      this.controls.minDistance = ORBIT_MIN_DISTANCE_PLAY;
    }
    if (this.neighborsMode) {
      this.pickNeighborsTarget();
      return;
    }
    const source = this.hotColdMode ? this.mysteryPool() : this.playable;
    const idx = Math.floor(Math.random() * source.length);
    this.target = source[idx] ?? null;
    if (this.target && this.identifyMode) {
      this.selectedIso = this.target.iso2;
      this.buildIdentifyChoices(this.target);
      this.refreshPolygonColors();
      this.flyToCountry(this.target, 900, { reveal: true });
    } else if (this.target) {
      // Never centre on the answer: start from a random neutral viewpoint.
      this.flyToCountry(this.target, 800, { viewFrom: this.neutralViewpoint(this.target) });
    }
    if (this.controls) {
      this.controls.minDistance = ORBIT_MIN_DISTANCE_PLAY;
    }
  }

  /** Random camera target at least ~70° of longitude away from the answer. */
  private neutralViewpoint(country: Country): { lat: number; lng: number } {
    const sign = Math.random() < 0.5 ? -1 : 1;
    let lng = country.lng + sign * (70 + Math.random() * 90);
    lng = ((((lng + 180) % 360) + 360) % 360) - 180;
    const lat = -20 + Math.random() * 60;
    return { lat, lng };
  }

  private flyToCountry(country: Country, ms = 1200, options?: GlobeFlyOptions): void {
    const g = this.globe as ThreeGlobeApi | null;
    const THREE = this.threeLib;
    if (!g?.getCoords || !this.camera || !this.controls || !THREE) {
      return;
    }
    const feature = this.featureForCountry(country);
    const areaKm2 = this.knowledge.getEntry(country.iso2)?.areaKm2;
    const spanKm = globeFeatureBBoxSpanKm(feature, country.lat);
    const relAltitude =
      options?.altitude ??
      globeFlyAltitude({
        areaKm2,
        spanKm,
        reveal: options?.reveal,
      });
    const end = g.getCoords(
      options?.viewFrom?.lat ?? country.lat,
      options?.viewFrom?.lng ?? country.lng,
      relAltitude,
    );
    const endPos = new THREE.Vector3(end.x, end.y, end.z);
    const start = this.camera.position.clone();

    const apply = (): void => {
      if (options?.reveal) {
        const revealMin = globeRevealMinControlDistance(endPos.length());
        this.controls!.minDistance = this.previewMode
          ? Math.min(ORBIT_MIN_DISTANCE_PREVIEW, revealMin)
          : revealMin;
      }
      this.controls!.target.set(0, 0, 0);
      this.controls!.update();
    };
    const syncPov = (): void => {
      apply();
      g.setPointOfView(this.camera!);
    };

    if (ms <= 0) {
      this.camera.position.copy(endPos);
      syncPov();
      this.renderLoop?.requestRender();
      return;
    }

    this.cancelFlyAnimation();
    const t0 = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = t * (2 - t);
      this.camera!.position.lerpVectors(start, endPos, eased);
      apply();
      this.applyPolygonColorRefresh();
      this.controls?.update();
      this.renderer!.render(this.scene!, this.camera!);
      if (t < 1) {
        this.flyRafId = this.renderLoop!.scheduleFrame(tick);
      } else {
        this.flyRafId = 0;
        syncPov();
      }
    };
    this.flyRafId = this.renderLoop!.scheduleFrame(tick);
  }

  private activePalette(): GlobeThemePalette {
    return this.previewMode ? globePreviewPalette() : this.themePalette;
  }

  private syncGlobeTheme(): void {
    if (this.previewMode) {
      return;
    }
    const themeId = this.globeTheme.theme();
    if (themeId !== this.appliedGlobeTheme) {
      this.applyGlobeTheme(themeId);
    }
  }

  private applyGlobeTheme(themeId: GlobeThemeId): void {
    this.themePalette = this.previewMode
      ? globePreviewPalette()
      : this.globeTheme.palette();
    this.appliedGlobeTheme = themeId;
    const g = this.globe as ThreeGlobeApi | null;
    if (g) {
      g.globeImageUrl(this.activePalette().globeTexture);
      g.polygonSideColor(() => this.activePalette().polygonSideColor);
    }
    this.lastPolygonStyleKey = '';
    this.polygonColorDirtyIsos = null;
    this.polygonColorsDirty = true;
    this.renderLoop?.requestRender();
  }

  private featureForCountry(country: Country): GlobeCountryFeature | undefined {
    const iso = country.iso2.toUpperCase();
    return this.geoFeatures.find((f) => iso2FromNaturalEarth(f.properties) === iso);
  }

  private nudgeCameraDistance(factor: number): void {
    if (!this.camera || !this.controls) {
      return;
    }
    this.cancelFlyAnimation();
    const distance = this.camera.position.length();
    if (distance <= 0) {
      return;
    }
    const next = Math.min(
      this.controls.maxDistance,
      Math.max(this.controls.minDistance, distance * factor),
    );
    this.camera.position.setLength(next);
    this.controls.update();
    const g = this.globe as ThreeGlobeApi | null;
    if (g) {
      g.setPointOfView(this.camera);
    }
    this.renderLoop?.requestRender();
  }

  private cancelFlyAnimation(): void {
    if (!this.flyRafId) {
      return;
    }
    if (this.renderLoop) {
      this.renderLoop.cancelFrame(this.flyRafId);
    } else {
      cancelAnimationFrame(this.flyRafId);
    }
    this.flyRafId = 0;
  }
}
