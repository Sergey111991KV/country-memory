/** Natural Earth admin-0 country feature (50m political boundaries). */
export type NaturalEarthCountryProps = {
  name?: string;
  ADMIN?: string;
  'ISO3166-1-Alpha-2'?: string;
  ISO_A2?: string;
  ISO_A2_EH?: string;
  WB_A2?: string;
  CONTINENT?: string;
  GDP_MD?: number | string;
};

export interface GlobeCountryFeature {
  type: 'Feature';
  properties: NaturalEarthCountryProps;
  geometry: { type: string; coordinates: unknown };
}

/** Globe base + relief (bundled locally for offline play). */
export const GLOBE_POLITICAL_TEXTURE = 'assets/globe/earth-dark.jpg';
export const GLOBE_BUMP_TEXTURE = 'assets/globe/earth-topology.png';

/** Higher value = coarser caps, fewer triangles (default in three-globe is 5). */
export const GLOBE_POLITICAL_CURVATURE_DEG = 24;

/** Cap DPR for the 3D globe (full device DPR is costly on mobile). */
export const GLOBE_MAX_PIXEL_RATIO = 1;

const CONTINENT_FILL: Record<string, string> = {
  Africa: 'rgba(210, 180, 120, 0.92)',
  Asia: 'rgba(120, 168, 130, 0.92)',
  Europe: 'rgba(130, 170, 210, 0.92)',
  'North America': 'rgba(190, 150, 110, 0.92)',
  'South America': 'rgba(140, 190, 130, 0.92)',
  Oceania: 'rgba(170, 150, 200, 0.92)',
  Antarctica: 'rgba(220, 230, 240, 0.75)',
  'Seven seas (open ocean)': 'rgba(100, 140, 180, 0.5)',
};

const DEFAULT_FILL = 'rgba(148, 163, 184, 0.88)';
const STROKE_DEFAULT = 'rgba(15, 23, 42, 0.55)';
const STROKE_SELECTED = 'rgba(255, 255, 255, 0.85)';

export interface GlobePolygonColorState {
  selectedIso: string | null;
  feedbackCorrectIso: string | null;
  feedbackWrongIso: string | null;
  phase: 'pick' | 'feedback';
  /** Multi-select mark games (explore filters). */
  multiSelected?: Set<string>;
  /** Expected matches shown after submit. */
  expectedIsos?: Set<string>;
}

/** ISO-3166 alpha-2 from Natural Earth (handles -99 sentinels). */
export function iso2FromNaturalEarth(props: NaturalEarthCountryProps | undefined): string {
  if (!props) {
    return '';
  }
  let raw = props['ISO3166-1-Alpha-2'] ?? props.ISO_A2 ?? '';
  if (!raw || raw === '-99') {
    raw = props.ISO_A2_EH ?? props.WB_A2 ?? '';
  }
  const iso = raw.toUpperCase();
  if (!iso || iso === '-99') {
    return '';
  }
  return iso;
}

export function politicalCapColor(
  feature: GlobeCountryFeature,
  state: GlobePolygonColorState,
): string {
  const iso = iso2FromNaturalEarth(feature.properties);
  if (state.phase === 'feedback' && iso && state.expectedIsos) {
    const picked = state.multiSelected?.has(iso) ?? false;
    const expected = state.expectedIsos.has(iso);
    if (picked && expected) {
      return 'rgba(34, 197, 94, 0.95)';
    }
    if (picked && !expected) {
      return 'rgba(239, 68, 68, 0.95)';
    }
    if (!picked && expected) {
      return 'rgba(250, 204, 21, 0.88)';
    }
  }
  if (state.phase === 'feedback') {
    if (iso && iso === state.feedbackCorrectIso) {
      return 'rgba(34, 197, 94, 0.95)';
    }
    if (iso && iso === state.feedbackWrongIso) {
      return 'rgba(239, 68, 68, 0.95)';
    }
  }
  if (iso && state.multiSelected?.has(iso)) {
    return 'rgba(59, 130, 246, 0.92)';
  }
  if (iso && iso === state.selectedIso) {
    return 'rgba(59, 130, 246, 0.92)';
  }
  const continent = feature.properties?.CONTINENT ?? '';
  return CONTINENT_FILL[continent] ?? DEFAULT_FILL;
}

export function politicalStrokeColor(
  feature: GlobeCountryFeature,
  state: GlobePolygonColorState,
): string {
  const iso = iso2FromNaturalEarth(feature.properties);
  if (
    iso &&
    (iso === state.selectedIso ||
      iso === state.feedbackCorrectIso ||
      state.multiSelected?.has(iso))
  ) {
    return STROKE_SELECTED;
  }
  if (state.phase === 'feedback' && iso && state.expectedIsos?.has(iso)) {
    return STROKE_SELECTED;
  }
  return STROKE_DEFAULT;
}

/** Drop Antarctica and nameless polygons; keep political countries only. */
export function filterPoliticalCountryFeatures(
  features: GlobeCountryFeature[],
): GlobeCountryFeature[] {
  return features.filter((f) => {
    const iso = iso2FromNaturalEarth(f.properties);
    return iso.length === 2 && iso !== 'AQ';
  });
}
