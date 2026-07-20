import {
  parseVisualQuality,
  visualQualityProfile,
} from './visual-quality';

describe('visualQualityProfile', () => {
  it('uses coarser globe and lighter flags on performance', () => {
    const p = visualQualityProfile('performance');
    expect(p.globe.polygonCurvatureDeg).toBeGreaterThan(
      visualQualityProfile('quality').globe.polygonCurvatureDeg,
    );
    expect(p.flag.animate).toBeTrue();
    expect(p.flag.windDisplacement).toBeFalse();
    expect(p.flag.sheen).toBeFalse();
  });

  it('uses finer globe on quality', () => {
    const p = visualQualityProfile('quality');
    expect(p.globe.useBumpMap).toBeTrue();
    expect(p.globe.antialias).toBeTrue();
    expect(p.flag.animate).toBeTrue();
  });
});

describe('parseVisualQuality', () => {
  it('defaults unknown values to balanced', () => {
    expect(parseVisualQuality(undefined)).toBe('balanced');
    expect(parseVisualQuality('fast')).toBe('balanced');
  });
});
