import {
  filterPoliticalCountryFeatures,
  iso2FromNaturalEarth,
  politicalCapColor,
} from './globe-geo';
import { globePreviewPalette } from '../data/globe-theme';

describe('globe-geo', () => {
  it('resolves ISO_A2_EH when ISO_A2 is -99', () => {
    expect(
      iso2FromNaturalEarth({ ISO_A2: '-99', ISO_A2_EH: 'FR', ADMIN: 'France' }),
    ).toBe('FR');
  });

  it('filters Antarctica', () => {
    const features = filterPoliticalCountryFeatures([
      {
        type: 'Feature',
        properties: { ISO_A2: 'AQ', CONTINENT: 'Antarctica' },
        geometry: { type: 'Polygon', coordinates: [] },
      },
      {
        type: 'Feature',
        properties: { ISO_A2: 'DE', CONTINENT: 'Europe' },
        geometry: { type: 'Polygon', coordinates: [] },
      },
    ]);
    expect(features.length).toBe(1);
    expect(iso2FromNaturalEarth(features[0].properties)).toBe('DE');
  });

  it('preview palette paints only the focused country red', () => {
    const feature = {
      type: 'Feature' as const,
      properties: { ISO_A2: 'PY', CONTINENT: 'South America' },
      geometry: { type: 'Polygon', coordinates: [] },
    };
    const other = {
      type: 'Feature' as const,
      properties: { ISO_A2: 'BR', CONTINENT: 'South America' },
      geometry: { type: 'Polygon', coordinates: [] },
    };
    const palette = globePreviewPalette();
    const focused = politicalCapColor(
      feature,
      {
        selectedIso: 'PY',
        feedbackCorrectIso: 'PY',
        feedbackWrongIso: null,
        phase: 'feedback',
      },
      palette,
    );
    const neighbor = politicalCapColor(
      other,
      {
        selectedIso: 'PY',
        feedbackCorrectIso: 'PY',
        feedbackWrongIso: null,
        phase: 'feedback',
      },
      palette,
    );
    expect(focused).toContain('239, 68, 68');
    expect(neighbor).toBe(palette.defaultFill);
  });

  it('custom fills win and base fill mutes the rest (game board)', () => {
    const fr = {
      type: 'Feature' as const,
      properties: { ISO_A2: 'FR', CONTINENT: 'Europe' },
      geometry: { type: 'Polygon', coordinates: [] },
    };
    const de = { ...fr, properties: { ISO_A2: 'DE', CONTINENT: 'Europe' } };
    const state = {
      selectedIso: null,
      feedbackCorrectIso: null,
      feedbackWrongIso: null,
      phase: 'pick' as const,
      customFills: new Map([['FR', 'rgba(1, 2, 3, 1)']]),
      baseFill: 'rgba(9, 9, 9, 1)',
    };
    expect(politicalCapColor(fr, state)).toBe('rgba(1, 2, 3, 1)');
    expect(politicalCapColor(de, state)).toBe('rgba(9, 9, 9, 1)');
  });
});
