import {
  globeThemePalette,
  type GlobeThemePalette,
} from '../data/globe-theme';

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

/** Globe base texture (bundled locally for offline play). */
export const GLOBE_POLITICAL_TEXTURE = 'assets/globe/earth-dark.jpg';
export const GLOBE_BUMP_TEXTURE = 'assets/globe/earth-topology.png';

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
  palette: GlobeThemePalette = globeThemePalette('classic'),
): string {
  const iso = iso2FromNaturalEarth(feature.properties);
  if (state.phase === 'feedback' && iso && state.expectedIsos) {
    const picked = state.multiSelected?.has(iso) ?? false;
    const expected = state.expectedIsos.has(iso);
    if (picked && expected) {
      return palette.correctFill;
    }
    if (picked && !expected) {
      return palette.wrongFill;
    }
    if (!picked && expected) {
      return palette.missedFill;
    }
  }
  if (state.phase === 'feedback') {
    if (iso && iso === state.feedbackCorrectIso) {
      return palette.correctFill;
    }
    if (iso && iso === state.feedbackWrongIso) {
      return palette.wrongFill;
    }
  }
  if (iso && state.multiSelected?.has(iso)) {
    return palette.selectedFill;
  }
  if (iso && iso === state.selectedIso) {
    return palette.selectedFill;
  }
  const continent = feature.properties?.CONTINENT ?? '';
  return palette.continentFill[continent] ?? palette.defaultFill;
}

export function politicalStrokeColor(
  feature: GlobeCountryFeature,
  state: GlobePolygonColorState,
  palette: GlobeThemePalette = globeThemePalette('classic'),
): string {
  const iso = iso2FromNaturalEarth(feature.properties);
  if (
    iso &&
    (iso === state.selectedIso ||
      iso === state.feedbackCorrectIso ||
      state.multiSelected?.has(iso))
  ) {
    return palette.strokeSelected;
  }
  if (state.phase === 'feedback' && iso && state.expectedIsos?.has(iso)) {
    return palette.strokeSelected;
  }
  return palette.strokeDefault;
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
