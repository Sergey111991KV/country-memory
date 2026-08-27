import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewDidEnter, ViewWillLeave } from '@ionic/angular';
import * as L from 'leaflet';

import type { ContinentId, Country, CountryProfileField } from '../../core/data/country.types';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { CountryCultureModalService } from '../../core/services/country-culture-modal.service';
import { CountryKnowledgeService } from '../../core/services/country-knowledge.service';
import { GeoJsonCacheService } from '../../core/services/geo-json-cache.service';
import { GlobeThemeService } from '../../core/services/globe-theme.service';
import { LocaleService } from '../../core/services/locale.service';
import {
  ATLAS_CONTINENT_FILTERS,
  atlasContinentDot,
  filterAtlasRowsByQueryAndContinent,
  formatSharePercent,
  normalizeAtlasFocusIso,
  populationSharePercent,
} from '../../core/utils/explore-atlas';
import {
  type GlobeCountryFeature,
  type GlobePolygonColorState,
  iso2FromNaturalEarth,
  politicalCapColor,
  politicalStrokeColor,
} from '../../core/utils/globe-geo';

export interface AtlasListRow {
  country: Country;
  name: string;
  population: number;
  sharePercent: number;
  shareLabel: string;
  dotColor: string;
  fields: CountryProfileField[];
}

const MAP_ZOOM_WORLD = 2;
const MAP_ZOOM_COUNTRY = 4;
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

@Component({
  selector: 'app-explore-atlas',
  templateUrl: './explore-atlas.page.html',
  styleUrls: ['./explore-atlas.page.scss'],
  standalone: false,
})
export class ExploreAtlasPage implements OnDestroy, ViewWillLeave, ViewDidEnter {
  @ViewChild('mapHost')
  private mapHost?: ElementRef<HTMLDivElement>;

  @ViewChild('panelList')
  private panelList?: ElementRef<HTMLDivElement>;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly cultureModal = inject(CountryCultureModalService);
  private readonly geoCache = inject(GeoJsonCacheService);
  private readonly globeTheme = inject(GlobeThemeService);
  private readonly ngZone = inject(NgZone);

  readonly continentFilters = ATLAS_CONTINENT_FILTERS;

  loading = true;
  loadError = false;
  searchQuery = '';
  continentFilter: ContinentId | null = null;
  selectedIso: string | null = null;
  expandedIso: string | null = null;
  panelCollapsed = false;
  rows: AtlasListRow[] = [];
  filteredRows: AtlasListRow[] = [];
  backToKnowledge = false;

  private geoFeatures: GlobeCountryFeature[] = [];
  private map: L.Map | null = null;
  private countriesLayer: L.GeoJSON | null = null;
  private layerByIso = new Map<string, L.Path>();
  private bootStarted = false;
  private lastStyleKey = '';
  private pendingFocusIso = '';
  private lastLocale: string | null = null;

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.backToKnowledge =
          (params.get('from') ?? '').toLowerCase() === 'knowledge';
        const focus = normalizeAtlasFocusIso(params.get('focus'));
        if (focus && this.bootStarted && !this.loading) {
          this.focusIso(focus);
        } else if (focus) {
          this.pendingFocusIso = focus;
        }
      });

    effect(() => {
      const lang = this.locale.langSig();
      if (!this.bootStarted || this.loading || this.rows.length === 0) {
        return;
      }
      if (this.lastLocale === lang) {
        return;
      }
      this.lastLocale = lang;
      this.refreshLocalizedRows();
    });
  }

  ionViewDidEnter(): void {
    this.backToKnowledge =
      (this.route.snapshot.queryParamMap.get('from') ?? '').toLowerCase() ===
      'knowledge';
    const focus = normalizeAtlasFocusIso(
      this.route.snapshot.queryParamMap.get('focus'),
    );
    if (focus) {
      this.pendingFocusIso = focus;
    }

    if (this.bootStarted) {
      this.ensureMapReady();
      if (this.pendingFocusIso) {
        this.focusIso(this.pendingFocusIso);
        this.pendingFocusIso = '';
      }
      return;
    }
    void this.boot();
  }

  ionViewWillLeave(): void {
    // Keep map for fast return.
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  goBack(): void {
    if (this.backToKnowledge) {
      void this.router.navigate(['/tabs/knowledge']);
      return;
    }
    void this.router.navigate(['/tabs/play']);
  }

  onSearchInput(ev: CustomEvent): void {
    this.searchQuery = String(ev.detail.value ?? '');
    this.applyFilter();
  }

  setContinentFilter(continent: ContinentId | null): void {
    this.continentFilter = this.continentFilter === continent ? null : continent;
    this.applyFilter();
  }

  isContinentActive(continent: ContinentId): boolean {
    return this.continentFilter === continent;
  }

  togglePanel(): void {
    this.panelCollapsed = !this.panelCollapsed;
  }

  selectRow(row: AtlasListRow, options?: { toggleExpand?: boolean }): void {
    const toggle = options?.toggleExpand ?? true;
    this.selectedIso = row.country.iso2;
    if (toggle) {
      this.expandedIso =
        this.expandedIso === row.country.iso2 ? null : row.country.iso2;
    } else {
      this.expandedIso = row.country.iso2;
    }
    if (this.panelCollapsed) {
      this.panelCollapsed = false;
    }
    this.refreshMapStyles();
    this.bringIsoToFront(row.country.iso2);
    this.flyToIso(row.country.iso2);
  }

  isExpanded(iso2: string): boolean {
    return this.expandedIso === iso2;
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  async openCulture(row: AtlasListRow): Promise<void> {
    const c = row.country;
    const lang = this.locale.language;
    await this.cultureModal.open({
      iso2: c.iso2,
      countryName: this.catalog.localizedName(c, lang),
      capital: this.catalog.localizedCapital(c, lang),
      continentLabel: this.locale.translate(`continent.${c.continent}`),
      continentId: c.continent,
    });
  }

  openGlobe(row?: AtlasListRow): void {
    const focus = row?.country.iso2 ?? this.selectedIso ?? undefined;
    const queryParams: Record<string, string> = {
      from: this.backToKnowledge ? 'knowledge' : 'atlas',
    };
    if (focus) {
      queryParams['focus'] = focus;
    } else {
      queryParams['browse'] = '1';
    }
    void this.router.navigate(['/tabs/play/globe-find'], { queryParams });
  }

  trackByIso(_index: number, row: AtlasListRow): string {
    return row.country.iso2;
  }

  continentLabel(continent: ContinentId): string {
    return this.locale.translate(`continent.${continent}`);
  }

  atlasDot(continent: ContinentId): string {
    return atlasContinentDot(continent);
  }

  private async boot(): Promise<void> {
    this.bootStarted = true;
    try {
      await Promise.all([
        this.catalog.ensureLoaded(),
        this.knowledge.ensureLoaded(),
      ]);
      const allFeatures = await this.geoCache.getPoliticalFeatures();
      const mapIso = new Set(
        allFeatures
          .map((f) => iso2FromNaturalEarth(f.properties))
          .filter((x): x is string => Boolean(x)),
      );
      const playable = this.catalog.filterPlayable(mapIso);
      const playableIso = new Set(playable.map((c) => c.iso2.toUpperCase()));
      this.geoFeatures = allFeatures.filter((f) =>
        playableIso.has(iso2FromNaturalEarth(f.properties)),
      );

      this.rows = this.buildRows(playable);
      this.lastLocale = this.locale.language;
      this.applyFilter();

      await this.waitForMapHost();
      this.initMap();
      this.loading = false;

      if (this.pendingFocusIso) {
        this.focusIso(this.pendingFocusIso);
        this.pendingFocusIso = '';
      }
    } catch (err) {
      console.error('Explore Atlas boot failed:', err);
      this.loadError = true;
      this.loading = false;
    }
  }

  private buildRows(playable: Country[]): AtlasListRow[] {
    const lang = this.locale.language;
    let worldTotal = 0;
    const draft: AtlasListRow[] = [];
    for (const country of playable) {
      const entry = this.knowledge.getEntry(country.iso2);
      const population = entry?.population ?? 0;
      worldTotal += population;
      draft.push({
        country,
        name: this.catalog.localizedName(country, lang),
        population,
        sharePercent: 0,
        shareLabel: '0',
        dotColor: atlasContinentDot(country.continent),
        fields: this.knowledge.getProfileFields(country, lang),
      });
    }
    for (const row of draft) {
      row.sharePercent = populationSharePercent(row.population, worldTotal);
      row.shareLabel = formatSharePercent(row.sharePercent);
    }
    draft.sort(
      (a, b) => b.population - a.population || a.name.localeCompare(b.name),
    );
    return draft;
  }

  private refreshLocalizedRows(): void {
    const playable = this.rows.map((r) => r.country);
    const selected = this.selectedIso;
    const expanded = this.expandedIso;
    this.rows = this.buildRows(playable);
    this.selectedIso = selected;
    this.expandedIso = expanded;
    this.applyFilter();
  }

  private applyFilter(): void {
    this.filteredRows = filterAtlasRowsByQueryAndContinent(
      this.rows,
      this.searchQuery,
      this.continentFilter,
    );
  }

  private focusIso(iso: string): void {
    const row = this.rows.find((r) => r.country.iso2 === iso);
    if (!row) {
      return;
    }
    this.selectRow(row, { toggleExpand: false });
    this.scrollRowIntoView(iso);
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
      maxZoom: 8,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
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

    this.layerByIso.clear();
    this.countriesLayer = L.geoJSON(collection, {
      style: (feature) => this.styleForFeature(feature as GlobeCountryFeature),
      onEachFeature: (feature, layer) => {
        const iso = iso2FromNaturalEarth(
          (feature as GlobeCountryFeature).properties,
        );
        if (iso) {
          this.layerByIso.set(iso, layer as L.Path);
        }
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
      this.layerByIso.clear();
    }
  }

  private polygonColorState(): GlobePolygonColorState {
    return {
      selectedIso: this.selectedIso,
      feedbackCorrectIso: null,
      feedbackWrongIso: null,
      phase: 'pick',
    };
  }

  private styleForFeature(feature: GlobeCountryFeature): L.PathOptions {
    const state = this.polygonColorState();
    const palette = this.globeTheme.palette();
    const iso = iso2FromNaturalEarth(feature.properties);
    const highlighted = Boolean(iso) && iso === state.selectedIso;
    return {
      fillColor: politicalCapColor(feature, state, palette),
      fillOpacity: highlighted ? 0.95 : 0.72,
      color: politicalStrokeColor(feature, state, palette),
      weight: highlighted ? 2.5 : 0.8,
    };
  }

  private refreshMapStyles(): void {
    const styleKey = `${this.globeTheme.theme()}|${this.selectedIso}`;
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

  private bringIsoToFront(iso: string): void {
    const layer = this.layerByIso.get(iso);
    if (layer && 'bringToFront' in layer) {
      (layer as L.Path).bringToFront();
    }
  }

  private onCountryClick(feature: GlobeCountryFeature): void {
    const iso = iso2FromNaturalEarth(feature.properties);
    if (!iso) {
      return;
    }
    this.ngZone.run(() => {
      const row = this.rows.find((r) => r.country.iso2 === iso);
      if (row) {
        this.selectRow(row, { toggleExpand: false });
        this.scrollRowIntoView(iso);
      }
    });
  }

  private scrollRowIntoView(iso: string): void {
    requestAnimationFrame(() => {
      const el = document.getElementById(`atlas-row-${iso}`);
      const host = this.panelList?.nativeElement;
      if (!el) {
        return;
      }
      if (host) {
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        const viewTop = host.scrollTop;
        const viewBottom = viewTop + host.clientHeight;
        if (elTop < viewTop) {
          host.scrollTo({ top: elTop - 8, behavior: 'smooth' });
        } else if (elBottom > viewBottom) {
          host.scrollTo({ top: elBottom - host.clientHeight + 8, behavior: 'smooth' });
        }
        return;
      }
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private flyToIso(iso: string, durationMs = 1200): void {
    if (!this.map) {
      return;
    }
    const layer = this.layerByIso.get(iso);
    if (layer && 'getBounds' in layer) {
      const bounds = (layer as L.Polygon).getBounds();
      if (bounds.isValid()) {
        this.map.flyToBounds(bounds, {
          padding: [48, 48],
          maxZoom: MAP_ZOOM_COUNTRY + 1,
          duration: durationMs / 1000,
          easeLinearity: 0.25,
        });
        return;
      }
    }
    const row = this.rows.find((r) => r.country.iso2 === iso);
    if (row) {
      this.map.flyTo([row.country.lat, row.country.lng], MAP_ZOOM_COUNTRY, {
        duration: durationMs / 1000,
        easeLinearity: 0.25,
      });
    }
  }
}
