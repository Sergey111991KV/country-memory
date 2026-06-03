import { Injectable, inject, signal } from '@angular/core';

import type { Country } from '../data/country.types';
import {
  DEFAULT_COUNTRY_METRIC_FILTERS,
  isDefaultCountryMetricFilters,
  TOP_N_BY_TIER,
  type CountryMetricFilters,
  type CountryMetricKind,
  type MetricFilterTier,
} from '../data/country-metric-filters';
import { CountryKnowledgeService } from './country-knowledge.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'flagfield_country_metric_filters_v1';

type MetricReader = (iso2: string) => number;

@Injectable({ providedIn: 'root' })
export class CountryMetricFilterService {
  private readonly storage = inject(StorageService);
  private readonly knowledge = inject(CountryKnowledgeService);

  private hydrated = false;
  private filters: CountryMetricFilters = { ...DEFAULT_COUNTRY_METRIC_FILTERS };

  readonly filtersSig = signal<CountryMetricFilters>({
    ...DEFAULT_COUNTRY_METRIC_FILTERS,
  });

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    this.hydrated = true;
    await this.knowledge.ensureLoaded();
    const stored = await this.storage.get<Partial<CountryMetricFilters>>(STORAGE_KEY);
    this.filters = this.normalizeFilters(stored);
    this.filtersSig.set({ ...this.filters });
  }

  getFilters(): CountryMetricFilters {
    return { ...this.filters };
  }

  isActive(): boolean {
    return !isDefaultCountryMetricFilters(this.filters);
  }

  async setFilters(next: CountryMetricFilters): Promise<void> {
    await this.hydrate();
    this.filters = this.normalizeFilters(next);
    this.filtersSig.set({ ...this.filters });
    await this.storage.set(STORAGE_KEY, this.filters);
  }

  async resetFilters(): Promise<void> {
    await this.setFilters({ ...DEFAULT_COUNTRY_METRIC_FILTERS });
  }

  async apply(countries: Country[]): Promise<Country[]> {
    await this.hydrate();
    if (!this.isActive() || countries.length === 0) {
      return countries;
    }

    let result = [...countries];
    result = this.applyMetric(result, 'population', this.filters.population);
    result = this.applyMetric(result, 'area', this.filters.area);
    result = this.applyMetric(result, 'gdp', this.filters.gdp);
    return result;
  }

  countMatching(countries: Country[]): number {
    if (!this.isActive()) {
      return countries.length;
    }
    return this.applySync(countries).length;
  }

  private applySync(countries: Country[]): Country[] {
    let result = [...countries];
    result = this.applyMetric(result, 'population', this.filters.population);
    result = this.applyMetric(result, 'area', this.filters.area);
    result = this.applyMetric(result, 'gdp', this.filters.gdp);
    return result;
  }

  private applyMetric(
    countries: Country[],
    kind: CountryMetricKind,
    tier: MetricFilterTier,
  ): Country[] {
    if (tier === 'any' || countries.length === 0) {
      return countries;
    }

    const reader = this.metricReader(kind);
    const ranked = [...countries].sort(
      (a, b) => reader(b.iso2) - reader(a.iso2),
    );
    const topN = TOP_N_BY_TIER[tier];
    if (topN) {
      const allowed = new Set(
        ranked.slice(0, Math.min(topN, ranked.length)).map((c) => c.iso2.toUpperCase()),
      );
      return countries.filter((c) => allowed.has(c.iso2.toUpperCase()));
    }

    const values = ranked
      .map((c) => reader(c.iso2))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    if (values.length === 0) {
      return [];
    }

    const lower = this.percentile(values, 1 / 3);
    const upper = this.percentile(values, 2 / 3);
    return countries.filter((country) => {
      const value = reader(country.iso2);
      if (value <= 0) {
        return false;
      }
      switch (tier) {
        case 'large':
          return value >= upper;
        case 'medium':
          return value >= lower && value < upper;
        case 'small':
          return value < lower;
        default:
          return true;
      }
    });
  }

  private metricReader(kind: CountryMetricKind): MetricReader {
    switch (kind) {
      case 'population':
        return (iso2) => this.knowledge.getEntry(iso2)?.population ?? 0;
      case 'area':
        return (iso2) => this.knowledge.getEntry(iso2)?.areaKm2 ?? 0;
      case 'gdp':
        return (iso2) => this.knowledge.getEntry(iso2)?.gdpUsd ?? 0;
    }
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }
    const index = (sortedValues.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
      return sortedValues[lower];
    }
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private normalizeFilters(
    raw: Partial<CountryMetricFilters> | null | undefined,
  ): CountryMetricFilters {
    const pick = (value: unknown, fallback: MetricFilterTier): MetricFilterTier => {
      const allowed: MetricFilterTier[] = [
        'any',
        'top15',
        'top30',
        'top50',
        'large',
        'medium',
        'small',
      ];
      return allowed.includes(value as MetricFilterTier)
        ? (value as MetricFilterTier)
        : fallback;
    };
    return {
      population: pick(raw?.population, DEFAULT_COUNTRY_METRIC_FILTERS.population),
      area: pick(raw?.area, DEFAULT_COUNTRY_METRIC_FILTERS.area),
      gdp: pick(raw?.gdp, DEFAULT_COUNTRY_METRIC_FILTERS.gdp),
    };
  }
}
