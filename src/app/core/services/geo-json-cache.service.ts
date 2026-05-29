import { Injectable } from '@angular/core';

import {
  type GlobeCountryFeature,
  filterPoliticalCountryFeatures,
  iso2FromNaturalEarth,
} from '../utils/globe-geo';

const GEO_URL = 'assets/geo/countries.geojson';

@Injectable({ providedIn: 'root' })
export class GeoJsonCacheService {
  private featuresPromise: Promise<GlobeCountryFeature[]> | null = null;
  private gdpByIso: Map<string, number> | null = null;

  async getPoliticalFeatures(): Promise<GlobeCountryFeature[]> {
    if (!this.featuresPromise) {
      this.featuresPromise = this.loadFeatures();
    }
    return this.featuresPromise;
  }

  async getGdpByIso(): Promise<Map<string, number>> {
    if (this.gdpByIso) {
      return this.gdpByIso;
    }
    const features = await this.getPoliticalFeatures();
    const map = new Map<string, number>();
    for (const f of features) {
      const iso = iso2FromNaturalEarth(f.properties);
      const raw = f.properties?.GDP_MD;
      const gdp = typeof raw === 'number' ? raw : Number(raw);
      if (iso && Number.isFinite(gdp) && gdp > 0) {
        map.set(iso, gdp);
      }
    }
    this.gdpByIso = map;
    return map;
  }

  private async loadFeatures(): Promise<GlobeCountryFeature[]> {
    const res = await fetch(GEO_URL);
    if (!res.ok) {
      throw new Error(`GeoJSON HTTP ${res.status}`);
    }
    const collection = (await res.json()) as { features?: GlobeCountryFeature[] };
    return filterPoliticalCountryFeatures(
      (collection.features ?? []) as GlobeCountryFeature[],
    );
  }
}
