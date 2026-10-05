import {
  bearingDeg,
  compassArrow,
  haversineKm,
  heatColor,
  minPointSetDistanceKm,
  proximityPercent,
  sampleGeometryPoints,
} from './geo-distance';

describe('geo-distance', () => {
  it('computes Paris → Berlin distance', () => {
    const km = haversineKm(48.8566, 2.3522, 52.52, 13.405);
    expect(km).toBeGreaterThan(860);
    expect(km).toBeLessThan(890);
  });

  it('points east from Paris to Berlin-ish', () => {
    const b = bearingDeg(48.85, 2.35, 48.85, 20);
    expect(compassArrow(b)).toBe('→');
    expect(compassArrow(0)).toBe('↑');
    expect(compassArrow(225)).toBe('↙');
  });

  it('samples and caps polygon points', () => {
    const ring = Array.from({ length: 500 }, (_, i) => [i / 10, 0]);
    const pts = sampleGeometryPoints({ coordinates: [[ring]] }, 50);
    expect(pts.length).toBe(50);
    expect(minPointSetDistanceKm([[0, 0]], [[0, 1]])).toBeCloseTo(111.2, 0);
  });

  it('maps distance to proximity and heat colours', () => {
    expect(proximityPercent(0)).toBe(100);
    expect(proximityPercent(30_000)).toBe(0);
    expect(heatColor(0)).toBe('rgba(153, 27, 27, 0.95)');
    expect(heatColor(50_000)).toBe('rgba(254, 249, 195, 0.95)');
  });
});
