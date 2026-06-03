export type VisualQuality = 'performance' | 'balanced' | 'quality';

export const VISUAL_QUALITY_LEVELS: VisualQuality[] = ['performance', 'balanced', 'quality'];

export interface GlobeVisualConfig {
  /** Higher = coarser country meshes (fewer triangles). */
  polygonCurvatureDeg: number;
  maxPixelRatio: number;
  antialias: boolean;
  useBumpMap: boolean;
}

export interface FlagVisualConfig {
  /** CSS sway animation on the flag fabric. */
  animate: boolean;
  /** SVG displacement “wind” filter (heavier GPU). */
  windDisplacement: boolean;
  /** Moving light sheen overlay. */
  sheen: boolean;
}

export interface VisualQualityProfile {
  globe: GlobeVisualConfig;
  flag: FlagVisualConfig;
}

const PROFILES: Record<VisualQuality, VisualQualityProfile> = {
  performance: {
    globe: {
      polygonCurvatureDeg: 32,
      maxPixelRatio: 1,
      antialias: false,
      useBumpMap: false,
    },
    flag: {
      animate: false,
      windDisplacement: false,
      sheen: false,
    },
  },
  balanced: {
    globe: {
      polygonCurvatureDeg: 24,
      maxPixelRatio: 1,
      antialias: false,
      useBumpMap: false,
    },
    flag: {
      animate: true,
      windDisplacement: true,
      sheen: true,
    },
  },
  quality: {
    globe: {
      polygonCurvatureDeg: 10,
      maxPixelRatio: 1.5,
      antialias: true,
      useBumpMap: true,
    },
    flag: {
      animate: true,
      windDisplacement: true,
      sheen: true,
    },
  },
};

export function parseVisualQuality(raw: unknown): VisualQuality {
  if (raw === 'performance' || raw === 'quality') {
    return raw;
  }
  return 'balanced';
}

export function visualQualityProfile(level: VisualQuality): VisualQualityProfile {
  return PROFILES[level];
}
