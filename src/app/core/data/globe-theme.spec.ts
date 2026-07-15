import { globeThemePalette, parseGlobeTheme } from '../data/globe-theme';

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
});
