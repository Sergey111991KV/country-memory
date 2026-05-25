import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
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
  GLOBE_MAX_PIXEL_RATIO,
  GLOBE_POLITICAL_CURVATURE_DEG,
  GLOBE_POLITICAL_TEXTURE,
  type GlobeCountryFeature,
  filterPoliticalCountryFeatures,
  iso2FromNaturalEarth,
  politicalCapColor,
  politicalStrokeColor,
} from '../../core/utils/globe-geo';
import { countryFeatureFromObject } from '../../core/utils/globe-pick';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { ensurePlaySessionAccess } from '../../core/utils/play-access';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';
import { GlobeRenderLoop } from '../../core/utils/globe-render-loop';

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

  loading = true;
  loadError = false;
  target: Country | null = null;
  selectedIso: string | null = null;
  phase: PickPhase = 'pick';
  feedbackCorrect = false;
  round = 1;
  searchQuery = '';
  searchHits: Country[] = [];
  /** Set when the current selection came from search (for learning analytics). */
  private pickedViaSearch = false;

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

  ionViewDidEnter(): void {
    if (this.bootStarted) {
      this.renderLoop?.setPaused(false);
      this.renderLoop?.requestRender();
      return;
    }
    void this.startSession();
  }

  private async startSession(): Promise<void> {
    await this.subscription.init();
    if (!this.subscription.isSubscribed()) {
      void this.router.navigate(['/paywall']);
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
    this.renderLoop?.stop();
    this.renderLoop = null;
    if (this.flyRafId) {
      cancelAnimationFrame(this.flyRafId);
      this.flyRafId = 0;
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderLoop?.stop();
    if (this.flyRafId) {
      cancelAnimationFrame(this.flyRafId);
    }
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

  onSearchInput(ev: CustomEvent): void {
    const q = String(ev.detail.value ?? '')
      .trim()
      .toLowerCase();
    this.searchQuery = q;
    if (!q) {
      this.searchHits = [];
      return;
    }
    const lang = this.locale.language;
    this.searchHits = this.playable
      .filter((c) => this.catalog.localizedName(c, lang).toLowerCase().includes(q))
      .slice(0, 8);
  }

  onSearchPick(country: Country): void {
    this.searchQuery = this.catalog.localizedName(country, this.locale.language);
    this.searchHits = [];
    this.pickedViaSearch = true;
    this.selectedIso = country.iso2;
    this.refreshPolygonColors();
    this.flyToCountry(country);
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

    await this.learning.recordAttempt(
      'globe_find',
      this.target.iso2,
      correct,
      this.pickedViaSearch,
    );
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
    this.flyToCountry(this.target);
  }

  goBack(): void {
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

  private async boot(): Promise<void> {
    try {
      await this.catalog.ensureLoaded();
      const geoRes = await fetch('assets/geo/countries.geojson');
      if (!geoRes.ok) {
        throw new Error(`GeoJSON HTTP ${geoRes.status}`);
      }
      const collection = (await geoRes.json()) as {
        features?: GlobeCountryFeature[];
      };
      const allFeatures = filterPoliticalCountryFeatures(
        (collection.features ?? []) as GlobeCountryFeature[],
      );
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
      await this.initGlobe();
      this.pickNewTarget();
      this.loading = false;
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
      throw new Error('THREE is not initialized (main.ts)');
    }
    return w.THREE;
  }

  private async waitForGlobeHost(): Promise<void> {
    for (let i = 0; i < 60; i++) {
      if (this.globeHost?.nativeElement) {
        return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    throw new Error('Globe host element missing');
  }

  private async initGlobe(): Promise<void> {
    if (this.globe) {
      return;
    }

    const THREE = this.getThree();
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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    this.camera.position.z = 320;

    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GLOBE_MAX_PIXEL_RATIO));
    host.appendChild(this.renderer.domElement);

    const globe = new ThreeGlobe({
      animateIn: false,
      waitForGlobeReady: true,
    }) as unknown as ThreeGlobeApi;

    globe
      .globeImageUrl(GLOBE_POLITICAL_TEXTURE)
      .bumpImageUrl(GLOBE_BUMP_TEXTURE)
      .showAtmosphere(false)
      .polygonsData(this.geoFeatures)
      .polygonCapColor((f) => this.colorForFeature(f))
      .polygonSideColor(() => 'rgba(30, 41, 59, 0.35)')
      .polygonStrokeColor((f) => this.strokeForFeature(f))
      .polygonAltitude(() => POLYGON_ALTITUDE)
      .polygonCapCurvatureResolution(GLOBE_POLITICAL_CURVATURE_DEG)
      .polygonsTransitionDuration(0)
      .onGlobeReady(() => this.renderLoop?.requestRender());

    this.scene.add(globe);
    this.globe = globe;

    const light = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(light);
    const dir = new THREE.DirectionalLight(0xffffff, 0.65);
    dir.position.set(1, 1, 1);
    this.scene.add(dir);

    this.controls = new OrbitControlsCtor(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 180;
    this.controls.maxDistance = 480;
    this.controls.addEventListener('change', () => this.renderLoop?.requestRender());

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

  private polygonColorState() {
    return {
      selectedIso: this.selectedIso,
      feedbackCorrectIso: this.feedbackCorrectIso,
      feedbackWrongIso: this.feedbackWrongIso,
      phase: this.phase,
    };
  }

  private colorForFeature(f: GlobeCountryFeature): string {
    return politicalCapColor(f, this.polygonColorState());
  }

  private strokeForFeature(f: GlobeCountryFeature): string {
    return politicalStrokeColor(f, this.polygonColorState());
  }

  private refreshPolygonColors(): void {
    const styleKey = `${this.phase}|${this.selectedIso}|${this.feedbackCorrectIso}|${this.feedbackWrongIso}`;
    if (styleKey === this.lastPolygonStyleKey) {
      return;
    }
    this.lastPolygonStyleKey = styleKey;
    const g = this.globe as ThreeGlobeApi | null;
    g?.polygonCapColor((f) => this.colorForFeature(f));
    g?.polygonStrokeColor((f) => this.strokeForFeature(f));
    this.renderLoop?.requestRender();
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
    this.pickedViaSearch = false;
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.feedbackCorrectIso = null;
    this.feedbackWrongIso = null;
    this.refreshPolygonColors();
    if (this.target) {
      this.flyToCountry(this.target, 800);
    }
  }

  private flyToCountry(country: Country, ms = 1200): void {
    const g = this.globe as ThreeGlobeApi | null;
    const THREE = this.threeLib;
    if (!g?.getCoords || !this.camera || !this.controls || !THREE) {
      return;
    }
    const end = g.getCoords(country.lat, country.lng, 2.35);
    const endPos = new THREE.Vector3(end.x, end.y, end.z);
    const start = this.camera.position.clone();

    const apply = (): void => {
      this.controls!.target.set(0, 0, 0);
      this.controls!.update();
      g.setPointOfView(this.camera!);
    };

    if (ms <= 0) {
      this.camera.position.copy(endPos);
      apply();
      this.renderLoop?.requestRender();
      return;
    }

    if (this.flyRafId) {
      cancelAnimationFrame(this.flyRafId);
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = t * (2 - t);
      this.camera!.position.lerpVectors(start, endPos, eased);
      apply();
      this.drawFrame();
      if (t < 1) {
        this.flyRafId = requestAnimationFrame(tick);
      } else {
        this.flyRafId = 0;
      }
    };
    this.ngZone.runOutsideAngular(() => {
      this.flyRafId = requestAnimationFrame(tick);
    });
  }
}
