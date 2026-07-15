export type GlobeThemeId = 'classic' | 'flagfield' | 'minimal';

const GLOBE_TEXTURE = 'assets/globe/earth-dark.jpg';

export const GLOBE_THEME_IDS: GlobeThemeId[] = ['classic', 'flagfield', 'minimal'];

export interface GlobeThemePalette {
  continentFill: Record<string, string>;
  defaultFill: string;
  strokeDefault: string;
  strokeSelected: string;
  polygonSideColor: string;
  globeTexture: string;
  selectedFill: string;
  correctFill: string;
  wrongFill: string;
  missedFill: string;
}

const CLASSIC_CONTINENT_FILL: Record<string, string> = {
  Africa: 'rgba(210, 180, 120, 0.92)',
  Asia: 'rgba(120, 168, 130, 0.92)',
  Europe: 'rgba(130, 170, 210, 0.92)',
  'North America': 'rgba(190, 150, 110, 0.92)',
  'South America': 'rgba(140, 190, 130, 0.92)',
  Oceania: 'rgba(170, 150, 200, 0.92)',
  Antarctica: 'rgba(220, 230, 240, 0.75)',
  'Seven seas (open ocean)': 'rgba(100, 140, 180, 0.5)',
};

const FLAGFIELD_CONTINENT_FILL: Record<string, string> = {
  Africa: 'rgba(176, 156, 204, 0.90)',
  Asia: 'rgba(148, 128, 196, 0.90)',
  Europe: 'rgba(167, 139, 250, 0.92)',
  'North America': 'rgba(156, 136, 204, 0.90)',
  'South America': 'rgba(132, 112, 188, 0.90)',
  Oceania: 'rgba(188, 168, 220, 0.90)',
  Antarctica: 'rgba(196, 190, 220, 0.72)',
  'Seven seas (open ocean)': 'rgba(88, 72, 140, 0.45)',
};

const MINIMAL_CONTINENT_FILL: Record<string, string> = {
  Africa: 'rgba(100, 116, 139, 0.86)',
  Asia: 'rgba(100, 116, 139, 0.86)',
  Europe: 'rgba(100, 116, 139, 0.86)',
  'North America': 'rgba(100, 116, 139, 0.86)',
  'South America': 'rgba(100, 116, 139, 0.86)',
  Oceania: 'rgba(100, 116, 139, 0.86)',
  Antarctica: 'rgba(148, 163, 184, 0.72)',
  'Seven seas (open ocean)': 'rgba(71, 85, 105, 0.45)',
};

const PALETTES: Record<GlobeThemeId, GlobeThemePalette> = {
  classic: {
    continentFill: CLASSIC_CONTINENT_FILL,
    defaultFill: 'rgba(148, 163, 184, 0.88)',
    strokeDefault: 'rgba(15, 23, 42, 0.55)',
    strokeSelected: 'rgba(255, 255, 255, 0.85)',
    polygonSideColor: 'rgba(30, 41, 59, 0.35)',
    globeTexture: GLOBE_TEXTURE,
    selectedFill: 'rgba(59, 130, 246, 0.92)',
    correctFill: 'rgba(34, 197, 94, 0.95)',
    wrongFill: 'rgba(239, 68, 68, 0.95)',
    missedFill: 'rgba(250, 204, 21, 0.88)',
  },
  flagfield: {
    continentFill: FLAGFIELD_CONTINENT_FILL,
    defaultFill: 'rgba(129, 112, 176, 0.88)',
    strokeDefault: 'rgba(22, 18, 43, 0.55)',
    strokeSelected: 'rgba(233, 213, 255, 0.90)',
    polygonSideColor: 'rgba(22, 18, 43, 0.40)',
    globeTexture: GLOBE_TEXTURE,
    selectedFill: 'rgba(167, 139, 250, 0.94)',
    correctFill: 'rgba(74, 222, 128, 0.95)',
    wrongFill: 'rgba(248, 113, 113, 0.95)',
    missedFill: 'rgba(250, 204, 21, 0.88)',
  },
  minimal: {
    continentFill: MINIMAL_CONTINENT_FILL,
    defaultFill: 'rgba(100, 116, 139, 0.86)',
    strokeDefault: 'rgba(15, 23, 42, 0.45)',
    strokeSelected: 'rgba(255, 255, 255, 0.82)',
    polygonSideColor: 'rgba(30, 41, 59, 0.30)',
    globeTexture: GLOBE_TEXTURE,
    selectedFill: 'rgba(96, 165, 250, 0.92)',
    correctFill: 'rgba(34, 197, 94, 0.95)',
    wrongFill: 'rgba(239, 68, 68, 0.95)',
    missedFill: 'rgba(250, 204, 21, 0.88)',
  },
};

export function parseGlobeTheme(raw: unknown): GlobeThemeId {
  if (raw === 'flagfield' || raw === 'minimal') {
    return raw;
  }
  return 'classic';
}

export function globeThemePalette(id: GlobeThemeId): GlobeThemePalette {
  return PALETTES[id];
}
