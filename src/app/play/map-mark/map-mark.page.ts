import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  ViewDidEnter,
  ViewWillLeave,
} from '@ionic/angular';
import * as L from 'leaflet';

import type { ExploreFilterId } from '../../core/data/explore-filters';
import { EXPLORE_FILTER_DEFS } from '../../core/data/explore-filters';
import type { Country } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { DailyGoalService } from '../../core/services/daily-goal.service';
import { ExploreFilterService } from '../../core/services/explore-filter.service';
import { GeoJsonCacheService } from '../../core/services/geo-json-cache.service';
import { GlobeThemeService } from '../../core/services/globe-theme.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlaySessionCompleteService } from '../../core/services/play-session-complete.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserLearningService } from '../../core/services/user-learning.service';
import {
  type GlobeCountryFeature,
  type GlobePolygonColorState,
  iso2FromNaturalEarth,
  politicalCapColor,
  politicalStrokeColor,
} from '../../core/utils/globe-geo';
import { ensurePlaySessionAccess } from '../../core/utils/play-access';
import { playDebug } from '../../core/utils/play-debug';
import { buildMapMarkSessionResult } from '../../core/utils/play-session-result-builders';

type MarkPhase = 'mark' | 'feedback';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

@Component({
  selector: 'app-map-mark',
  templateUrl: './map-mark.page.html',
  styleUrls: ['./map-mark.page.scss'],
  standalone: false,
})
export class MapMarkPage implements OnDestroy, ViewWillLeave, ViewDidEnter {
  @ViewChild('mapHost')
  private mapHost?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly exploreFilter = inject(ExploreFilterService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly sessionComplete = inject(PlaySessionCompleteService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly ngZone = inject(NgZone);
  private readonly geoCache = inject(GeoJsonCacheService);
  private readonly globeTheme = inject(GlobeThemeService);

  filterId: ExploreFilterId = 'lang_spanish';
  loading = true;
  loadError = false;
  phase: MarkPhase = 'mark';
  selectedIsos = new Set<string>();
  expectedIsos = new Set<string>();
  correctHits = 0;
  wrongHits = 0;
  missed = 0;
  scorePercent = 0;
  expectedCount = 0;

  private playable: Country[] = [];
  private geoFeatures: GlobeCountryFeature[] = [];
  private map: L.Map | null = null;
  private countriesLayer: L.GeoJSON | null = null;
  private bootStarted = false;
  private lastStyleKey = '';

  ionViewDidEnter(): void {
    if (this.bootStarted) {
      this.ensureMapReady();
      this.lastStyleKey = '';
      this.refreshMapStyles();
      return;
    }
    void this.startSession();
  }

  ionViewWillLeave(): void {
    // Keep map for fast return.
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  get filterTitleKey(): string {
    return (
      EXPLORE_FILTER_DEFS.find((d) => d.id === this.filterId)?.titleKey ??
      'explore.filter.langSpanish'
    );
  }

  get promptKey(): string {
    return (
      EXPLORE_FILTER_DEFS.find((d) => d.id === this.filterId)?.promptKey ??
      'explore.filter.langSpanishPrompt'
    );
  }

  get canSubmit(): boolean {
    return this.phase === 'mark' && this.selectedIsos.size > 0;
  }

  get showFeedback(): boolean {
    return this.phase === 'feedback';
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) {
      const t = await this.toastCtrl.create({
        message: this.locale.translate('mapMark.needPick'),
        duration: 1600,
      });
      await t.present();
      return;
    }
    let correctHits = 0;
    let wrongHits = 0;
    for (const iso of this.selectedIsos) {
      if (this.expectedIsos.has(iso)) {
        correctHits += 1;
      } else {
        wrongHits += 1;
      }
    }
    const missed = Math.max(0, this.expectedIsos.size - correctHits);
    const maxScore = this.expectedIsos.size + wrongHits;
    const rawScore = correctHits - wrongHits;
    this.correctHits = correctHits;
    this.wrongHits = wrongHits;
    this.missed = missed;
    this.scorePercent =
      maxScore > 0 ? Math.max(0, Math.round((rawScore / this.expectedIsos.size) * 100)) : 0;
    this.phase = 'feedback';
    this.refreshMapStyles();
    if (correctHits > 0 && wrongHits === 0 && missed === 0) {
      await this.dailyGoal.bumpProgress();
    }
    for (const iso of this.expectedIsos) {
      if (this.selectedIsos.has(iso)) {
        await this.learning.recordAttempt('map_find', iso, true, false);
      }
    }
  }

  async playAgain(): Promise<void> {
    this.phase = 'mark';
    this.selectedIsos.clear();
    this.correctHits = 0;
    this.wrongHits = 0;
    this.missed = 0;
    this.scorePercent = 0;
    this.refreshMapStyles();
  }

  async finish(): Promise<void> {
    await this.sessionComplete.finishWithResult(
      buildMapMarkSessionResult({
        correct: this.correctHits,
        wrong: this.wrongHits,
        missed: this.missed,
        percent: this.scorePercent,
        filterTitleKey: this.filterTitleKey,
      }),
    );
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
    const id = this.route.snapshot.paramMap.get('filterId') as ExploreFilterId | null;
    if (!id || !EXPLORE_FILTER_DEFS.some((d) => d.id === id)) {
      void this.router.navigate(['/tabs/play']);
      this.loading = false;
      return;
    }
    this.filterId = id;
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    await this.boot();
  }

  private async boot(): Promise<void> {
    try {
      await this.catalog.ensureLoaded();
      const matching = await this.exploreFilter.getMatchingCountries(this.filterId);
      if (matching.length < 2) {
        const alert = await this.alertCtrl.create({
          header: this.locale.translate('mapMark.tooFewTitle'),
          message: this.locale.translate('mapMark.tooFewBody'),
          buttons: [
            {
              text: this.locale.translate('common.ok'),
              handler: () => {
                void this.router.navigate(['/tabs/play']);
              },
            },
          ],
        });
        await alert.present();
        this.loading = false;
        return;
      }
      this.expectedIsos = new Set(matching.map((c) => c.iso2.toUpperCase()));
      this.expectedCount = this.expectedIsos.size;
      playDebug('MapMark', 'filter loaded', {
        filterId: this.filterId,
        expectedCount: this.expectedCount,
      });

      const allFeatures = await this.geoCache.getPoliticalFeatures();
      const mapIso = new Set(
        allFeatures
          .map((f) => iso2FromNaturalEarth(f.properties))
          .filter((x): x is string => Boolean(x)),
      );
      this.playable = this.catalog.filterPlayable(mapIso);
      const playableIso = new Set(this.playable.map((c) => c.iso2.toUpperCase()));
      this.geoFeatures = allFeatures.filter((f) =>
        playableIso.has(iso2FromNaturalEarth(f.properties)),
      );
      await this.waitForMapHost();
      this.initMap();
      this.loading = false;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('Map mark boot failed:', detail, err);
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
      zoom: 2,
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
      selectedIso: null,
      feedbackCorrectIso: null,
      feedbackWrongIso: null,
      phase: 'pick',
      multiSelected: this.selectedIsos,
      expectedIsos: this.phase === 'feedback' ? this.expectedIsos : undefined,
    };
  }

  private styleForFeature(feature: GlobeCountryFeature): L.PathOptions {
    const state = this.polygonColorState();
    const palette = this.globeTheme.palette();
    const iso = iso2FromNaturalEarth(feature.properties);
    const highlighted =
      Boolean(iso) &&
      (state.multiSelected?.has(iso ?? '') ||
        (this.phase === 'feedback' &&
          (state.expectedIsos?.has(iso ?? '') || state.multiSelected?.has(iso ?? ''))));
    return {
      fillColor: politicalCapColor(feature, state, palette),
      fillOpacity: 1,
      color: politicalStrokeColor(feature, state, palette),
      weight: highlighted ? 2 : 1,
    };
  }

  private refreshMapStyles(): void {
    const styleKey = `${this.globeTheme.theme()}|${this.phase}|${[...this.selectedIsos].join(',')}|${this.correctHits}`;
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
    if (this.phase !== 'mark') {
      return;
    }
    const iso = iso2FromNaturalEarth(feature.properties);
    if (!iso) {
      return;
    }
    this.ngZone.run(() => {
      if (this.selectedIsos.has(iso)) {
        this.selectedIsos.delete(iso);
      } else {
        this.selectedIsos.add(iso);
      }
      this.refreshMapStyles();
    });
  }
}
