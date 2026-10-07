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
import * as L from 'leaflet';

import type { Country } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { LocaleService } from '../../core/services/locale.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import {
  type GlobeCountryFeature,
  type GlobePolygonColorState,
  filterPoliticalCountryFeatures,
  iso2FromNaturalEarth,
  politicalCapColor,
  politicalStrokeColor,
} from '../../core/utils/globe-geo';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { GeoJsonCacheService } from '../../core/services/geo-json-cache.service';
import { GlobeThemeService } from '../../core/services/globe-theme.service';
import { PerfLogService } from '../../core/services/perf-log.service';
import { ensurePlaySessionAccess, ensurePremiumPlayAccess } from '../../core/utils/play-access';
import { buildSoloSessionResult } from '../../core/utils/play-session-result-builders';

type PickPhase = 'pick' | 'feedback';

const ROUNDS_PER_SESSION = 10;
const MAP_ZOOM_WORLD = 2;
const MAP_ZOOM_COUNTRY = 4;
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

@Component({
  selector: 'app-map-find',
  templateUrl: './map-find.page.html',
  styleUrls: ['./map-find.page.scss'],
  standalone: false,
})
export class MapFindPage implements OnDestroy, ViewWillLeave, ViewDidEnter {
  @ViewChild('mapHost')
  private mapHost?: ElementRef<HTMLDivElement>;

  private readonly router = inject(Router);
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly learning = inject(UserLearningService);
  /** Countries already asked this session (no repeats). */
  private readonly askedIsos = new Set<string>();
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
  private readonly globeTheme = inject(GlobeThemeService);

  loading = true;
  loadError = false;
  target: Country | null = null;
  selectedIso: string | null = null;
  phase: PickPhase = 'pick';
  feedbackCorrect = false;
  round = 1;
  searchQuery = '';
  searchHits: Country[] = [];

  private pickedViaSearch = false;
  private playable: Country[] = [];
  private geoFeatures: GlobeCountryFeature[] = [];
  private map: L.Map | null = null;
  private countriesLayer: L.GeoJSON | null = null;
  private bootStarted = false;
  private lastStyleKey = '';
  private feedbackCorrectIso: string | null = null;
  private feedbackWrongIso: string | null = null;

  readonly roundsTotal = ROUNDS_PER_SESSION;

  ionViewDidEnter(): void {
    if (this.bootStarted) {
      this.ensureMapReady();
      this.lastStyleKey = '';
      this.refreshMapStyles();
      return;
    }
    void this.startSession();
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
    // Keep map instance for fast return; size is refreshed on re-enter.
  }

  ngOnDestroy(): void {
    this.destroyMap();
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
    this.refreshMapStyles();
    this.flyToCountry(country);
  }

  async verify(): Promise<void> {
    if (!this.target || !this.selectedIso) {
      const t = await this.toastCtrl.create({
        message: this.locale.translate('map.needPick'),
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
    this.refreshMapStyles();

    await this.learning.recordAttempt(
      'map_find',
      this.target.iso2,
      correct,
      this.pickedViaSearch,
      this.selectedIso,
    );
    if (!correct) {
      this.flyToCountry(this.target);
    }
    this.playSession.recordAnswer(correct);
    if (correct) {
      await this.dailyGoal.bumpProgress();
    }
  }

  async nextRound(): Promise<void> {
    if (this.round >= ROUNDS_PER_SESSION) {
      await this.sessionComplete.finishWithResult(
        buildSoloSessionResult({
          titleKey: 'sessionResult.mapTitle',
          doneHeaderKey: 'map.sessionDone',
          correct: this.playSession.sessionCorrect,
          total: ROUNDS_PER_SESSION,
          subtitleKey: 'play.mapFindTitle',
        }),
      );
      return;
    }
    this.round += 1;
    this.pickNewTarget();
  }

  showCorrectOnMap(): void {
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
    const totalSpan = this.perf.span('MapQuest', 'boot');
    try {
      const catalogSpan = this.perf.span('MapQuest', 'catalog');
      await this.catalog.ensureLoaded();
      catalogSpan.end();
      const geoSpan = this.perf.span('MapQuest', 'geoJson');
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
      await this.waitForMapHost();
      const mapSpan = this.perf.span('MapQuest', 'initMap');
      this.initMap();
      mapSpan.end({ playable: this.playable.length });
      this.pickNewTarget();
      this.loading = false;
      totalSpan.end({
        playable: this.playable.length,
        geoFeatures: this.geoFeatures.length,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('Map Quest boot failed:', detail, err);
      this.loadError = true;
      this.loading = false;
    }
  }

  private async waitForMapHost(): Promise<void> {
    for (let i = 0; i < 60; i++) {
      if (this.mapHost?.nativeElement) {
        return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    throw new Error('Map host element missing');
  }

  private ensureMapReady(): void {
    if (!this.map && !this.loading && !this.loadError && this.geoFeatures.length > 0) {
      void this.waitForMapHost().then(() => {
        this.initMap();
        this.refreshMapStyles();
      });
      return;
    }
    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      this.refreshMapStyles();
    });
  }

  private initMap(): void {
    if (this.map) {
      return;
    }
    const host = this.mapHost?.nativeElement;
    if (!host) {
      throw new Error('Map host element missing');
    }

    this.map = L.map(host, {
      center: [20, 0],
      zoom: MAP_ZOOM_WORLD,
      minZoom: 2,
      maxZoom: 6,
      worldCopyJump: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    const collection = {
      type: 'FeatureCollection',
      features: this.geoFeatures,
    } as GeoJSON.FeatureCollection;
    this.countriesLayer = L.geoJSON(collection, {
      style: (feature) => this.styleForFeature(feature as GlobeCountryFeature),
      onEachFeature: (feature, layer) => {
        layer.on('click', (ev: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(ev);
          this.onCountryClick(feature as GlobeCountryFeature);
        });
      },
    }).addTo(this.map);

    requestAnimationFrame(() => this.map?.invalidateSize());
    if (this.target) {
      this.showNeutralWorld(0);
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.countriesLayer = null;
    }
  }

  private polygonColorState(): GlobePolygonColorState {
    return {
      selectedIso: this.selectedIso,
      feedbackCorrectIso: this.feedbackCorrectIso,
      feedbackWrongIso: this.feedbackWrongIso,
      phase: this.phase,
    };
  }

  private styleForFeature(feature: GlobeCountryFeature): L.PathOptions {
    const state = this.polygonColorState();
    const palette = this.globeTheme.palette();
    const iso = iso2FromNaturalEarth(feature.properties);
    const highlighted =
      Boolean(iso) &&
      (iso === state.selectedIso ||
        iso === state.feedbackCorrectIso ||
        iso === state.feedbackWrongIso);
    return {
      fillColor: politicalCapColor(feature, state, palette),
      fillOpacity: 1,
      color: politicalStrokeColor(feature, state, palette),
      weight: highlighted ? 2 : 1,
    };
  }

  private refreshMapStyles(): void {
    const styleKey = `${this.globeTheme.theme()}|${this.phase}|${this.selectedIso}|${this.feedbackCorrectIso}|${this.feedbackWrongIso}`;
    if (styleKey === this.lastStyleKey) {
      return;
    }
    this.lastStyleKey = styleKey;
    this.countriesLayer?.eachLayer((layer) => {
      const feature = (layer as L.Layer & { feature?: GlobeCountryFeature }).feature;
      if (feature) {
        (layer as L.Path).setStyle(this.styleForFeature(feature));
      }
    });
  }

  private onCountryClick(feature: GlobeCountryFeature): void {
    if (this.phase !== 'pick') {
      return;
    }
    const iso = iso2FromNaturalEarth(feature.properties);
    if (!iso) {
      return;
    }
    this.ngZone.run(() => {
      this.pickedViaSearch = false;
      this.selectedIso = iso;
      this.refreshMapStyles();
    });
  }

  private pickNewTarget(): void {
    if (this.playable.length === 0) {
      return;
    }
    this.target = this.learning.pickForReview(this.playable, this.askedIsos);
    if (this.target) {
      this.askedIsos.add(this.target.iso2);
    }
    this.selectedIso = null;
    this.pickedViaSearch = false;
    this.phase = 'pick';
    this.feedbackCorrect = false;
    this.feedbackCorrectIso = null;
    this.feedbackWrongIso = null;
    this.searchQuery = '';
    this.searchHits = [];
    this.refreshMapStyles();
    // Never centre on the answer — show the whole world from a random longitude.
    this.showNeutralWorld(800);
  }

  private showNeutralWorld(durationMs: number): void {
    if (!this.map) {
      return;
    }
    const center: L.LatLngExpression = [20, -150 + Math.random() * 300];
    if (durationMs <= 0) {
      this.map.setView(center, MAP_ZOOM_WORLD);
      return;
    }
    this.map.flyTo(center, MAP_ZOOM_WORLD, { duration: durationMs / 1000 });
  }

  private flyToCountry(country: Country, durationMs = 1200): void {
    if (!this.map) {
      return;
    }
    const zoom = MAP_ZOOM_COUNTRY;
    if (durationMs <= 0) {
      this.map.setView([country.lat, country.lng], zoom, { animate: false });
      return;
    }
    this.map.flyTo([country.lat, country.lng], zoom, { duration: durationMs / 1000 });
  }
}
