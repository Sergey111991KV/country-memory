import { globePreviewPalette, globeThemePalette, parseGlobeTheme } from '../data/globe-theme';

describe('globe-theme', () => {
  it('defaults unknown values to classic', () => {
    expect(parseGlobeTheme('nope')).toBe('classic');
    expect(parseGlobeTheme(undefined)).toBe('classic');
  });

  it('exposes distinct flagfield selection color', () => {
    const classic = globeThemePalette('classic');
    const flagfield = globeThemePalette('flagfield');
    expect(flagfield.selectedFill).not.toBe(classic.selectedFill);
    expect(flagfield.continentFill['Europe']).toContain('167, 139, 250');
  });

  it('uses one fill for minimal continents', () => {
    const minimal = globeThemePalette('minimal');
    expect(minimal.continentFill['Asia']).toBe(minimal.continentFill['Europe']);
  });

  it('preview palette is flat gray with red target', () => {
    const preview = globePreviewPalette();
    expect(preview.continentFill['Europe']).toBe(preview.defaultFill);
    expect(preview.continentFill['Asia']).toBe(preview.defaultFill);
    expect(preview.correctFill).toBe(preview.selectedFill);
    expect(preview.correctFill).toContain('239, 68, 68');
    expect(preview.defaultFill).not.toContain('239, 68, 68');
  });
});
