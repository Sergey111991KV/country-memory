export type MetricFilterTier =
  | 'any'
  | 'top15'
  | 'top30'
  | 'top50'
  | 'large'
  | 'medium'
  | 'small';

export type CountryMetricKind = 'population' | 'area' | 'gdp';

export interface CountryMetricFilters {
  population: MetricFilterTier;
  area: MetricFilterTier;
  gdp: MetricFilterTier;
}

export const DEFAULT_COUNTRY_METRIC_FILTERS: CountryMetricFilters = {
  population: 'any',
  area: 'any',
  gdp: 'any',
};

export const METRICS_REFERENCE_YEAR = 2025;

export const METRIC_FILTER_TIER_OPTIONS: MetricFilterTier[] = [
  'any',
  'top15',
  'top30',
  'top50',
  'large',
  'medium',
  'small',
];

export const TOP_N_BY_TIER: Partial<Record<MetricFilterTier, number>> = {
  top15: 15,
  top30: 30,
  top50: 50,
};

export function isDefaultCountryMetricFilters(
  filters: CountryMetricFilters,
): boolean {
  return (
    filters.population === 'any' &&
    filters.area === 'any' &&
    filters.gdp === 'any'
  );
}

export function metricFilterTierKey(
  kind: CountryMetricKind,
  tier: MetricFilterTier,
): string {
  return `settings.metricFilter.${kind}.${tier}`;
}
