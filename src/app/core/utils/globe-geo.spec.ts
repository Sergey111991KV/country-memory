import {
  filterPoliticalCountryFeatures,
  iso2FromNaturalEarth,
  politicalCapColor,
} from './globe-geo';

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

  it('highlights selected country', () => {
    const feature = {
      type: 'Feature' as const,
      properties: { ISO_A2: 'DE', CONTINENT: 'Europe' },
      geometry: { type: 'Polygon', coordinates: [] },
    };
    const selected = politicalCapColor(feature, {
      selectedIso: 'DE',
      feedbackCorrectIso: null,
      feedbackWrongIso: null,
      phase: 'pick',
    });
    expect(selected).toContain('59, 130, 246');
  });
});
