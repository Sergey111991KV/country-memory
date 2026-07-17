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

import type { Country } from '../../core/data/country.types';
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
const ORBIT_MAX_DISTANCE = 480;

interface GlobeFlyOptions {
  reveal?: boolean;
}

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
  private readonly visualQuality = inject(VisualQualityService);
  private readonly globeTheme = inject(GlobeThemeService);

  loading = true;
  loadError = false;
  /** Lookup mode from quiz (query ?focus=ISO) — no scoring session. */
  previewMode = false;
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
    politicalCapColor(f, this.polygonStyleState, this.themePalette);
  private readonly strokeColorFn = (f: GlobeCountryFeature): string =>
    politicalStrokeColor(f, this.polygonStyleState, this.themePalette);
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
    const focusIso = (this.route.snapshot.queryParamMap.get('focus') ?? '')
      .trim()
      .toUpperCase();
    if (focusIso.length === 2) {
      void this.startPreview(focusIso);
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
    await this.bootPreview(iso2);
  }

  private async startSession(): Promise<void> {
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
    this.cancelFlyAnimation();
    this.renderLoop?.stop();
    this.renderLoop = null;
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

    await this.learning.recordAttempt('globe_find', this.target.iso2, correct, false);
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
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

  goBack(): void {
    if (this.previewMode) {
      this.location.back();
      return;
    }
    void this.router.navigate(['/tabs/play']);
  }

  continentLabel(country: Country): string {
    return this.locale.translate(`continent.${country.continent}`);
  }

  explainLine(country: Country): string {
    return this.locale.translate('globe.explainLine', {
      capital: this.catalog.localizedCapital(country, this.locale.language),
      continent: this.continentLabel(country),
    });
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
      queueMicrotask(() => this.flyToCountry(country, 1400, { reveal: true }));
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
      const pool = await this.playSession.resolvePool();
      const poolIso = new Set(pool.map((c) => c.iso2.toUpperCase()));
      this.playable = this.catalog
        .filterPlayable(mapIso)
        .filter((c) => poolIso.has(c.iso2.toUpperCase()));
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
      this.pickNewTarget();
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
      .globeImageUrl(this.themePalette.globeTexture)
      .showAtmosphere(false);
    if (globeCfg.useBumpMap) {
      globeLayer = globeLayer.bumpImageUrl(GLOBE_BUMP_TEXTURE);
    }
    globeLayer
      .polygonsData(this.geoFeatures)
      .polygonCapColor(this.capColorFn)
      .polygonSideColor(() => this.themePalette.polygonSideColor)
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
    this.controls.minDistance = ORBIT_MIN_DISTANCE_PLAY;
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
    const onlyIsos = this.polygonColorDirtyIsos ?? undefined;
    refreshGlobePolygonColors(this.globe, this.polygonStyleState, {
      onlyIsos,
      palette: this.themePalette,
    });
    this.polygonColorDirtyIsos = null;
  }

  private pickCountryAtPointer(clientX: number, clientY: number): void {
    if (
      this.phase !== 'pick' ||
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
            this.selectedIso = iso;
            this.refreshPolygonColors();
          });
        }
        return;
      }
    }
  }

  private pickNewTarget(): void {
    if (this.playable.length === 0) {
      return;
    }
    const idx = Math.floor(Math.random() * this.playable.length);
    this.target = this.playable[idx] ?? null;
    this.selectedIso = null;
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.feedbackCorrectIso = null;
    this.feedbackWrongIso = null;
    this.refreshPolygonColors();
    if (this.target) {
      this.flyToCountry(this.target, 800);
    }
    if (this.controls) {
      this.controls.minDistance = ORBIT_MIN_DISTANCE_PLAY;
    }
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
    const relAltitude = globeFlyAltitude({
      areaKm2,
      spanKm,
      reveal: options?.reveal,
    });
    const end = g.getCoords(country.lat, country.lng, relAltitude);
    const endPos = new THREE.Vector3(end.x, end.y, end.z);
    const start = this.camera.position.clone();

    const apply = (): void => {
      if (options?.reveal) {
        this.controls!.minDistance = globeRevealMinControlDistance(endPos.length());
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

  private syncGlobeTheme(): void {
    const themeId = this.globeTheme.theme();
    if (themeId !== this.appliedGlobeTheme) {
      this.applyGlobeTheme(themeId);
    }
  }

  private applyGlobeTheme(themeId: GlobeThemeId): void {
    this.themePalette = this.globeTheme.palette();
    this.appliedGlobeTheme = themeId;
    const g = this.globe as ThreeGlobeApi | null;
    if (g) {
      g.globeImageUrl(this.themePalette.globeTexture);
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
