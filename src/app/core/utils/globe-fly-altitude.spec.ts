import {
  GLOBE_FLY_ALTITUDE_ROUND,
  globeFeatureBBoxSpanKm,
  globeFlyAltitude,
  globeRevealMinControlDistance,
} from './globe-fly-altitude';
import type { GlobeCountryFeature } from './globe-geo';

describe('globeFlyAltitude', () => {
  it('keeps the default round altitude when not revealing', () => {
    expect(globeFlyAltitude({ areaKm2: 0.44, reveal: false })).toBe(GLOBE_FLY_ALTITUDE_ROUND);
  });

  it('flies closer for microstates than for large countries', () => {
    const vatican = globeFlyAltitude({ areaKm2: 0.44, reveal: true });
    const russia = globeFlyAltitude({ areaKm2: 17_098_242, reveal: true });
    expect(vatican).toBeLessThan(0.2);
    expect(russia).toBeGreaterThan(1.4);
    expect(vatican).toBeLessThan(russia);
  });

  it('uses the closer estimate when both area and span are known', () => {
    const alt = globeFlyAltitude({
      areaKm2: 500_000,
      spanKm: 40,
      reveal: true,
    });
    const fromSpanOnly = globeFlyAltitude({ spanKm: 40, reveal: true });
    expect(alt).toBe(fromSpanOnly);
  });
});

describe('globeFeatureBBoxSpanKm', () => {
  it('returns span for a simple polygon', () => {
    const feature: GlobeCountryFeature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [12, 41],
            [13, 41],
            [13, 42],
            [12, 42],
            [12, 41],
          ],
        ],
      },
    };
    const span = globeFeatureBBoxSpanKm(feature, 41.5);
    expect(span).toBeGreaterThan(90);
    expect(span).toBeLessThan(160);
  });
});

describe('globeRevealMinControlDistance', () => {
  it('allows closer orbit than the default play distance', () => {
    expect(globeRevealMinControlDistance(108)).toBeLessThan(180);
    expect(globeRevealMinControlDistance(108)).toBeGreaterThanOrEqual(70);
    // Headroom below reveal pose so zoom-in still works after fly-to.
    expect(globeRevealMinControlDistance(108)).toBeLessThan(108 * 0.72);
  });
});
