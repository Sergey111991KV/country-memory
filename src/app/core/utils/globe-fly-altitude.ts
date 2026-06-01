import type { GlobeCountryFeature } from './globe-geo';

/** Relative altitude above the three-globe surface (see `getCoords` in three-globe). */
export const GLOBE_FLY_ALTITUDE_ROUND = 2.35;

const REVEAL_ALTITUDE_MIN = 0.08;
const REVEAL_ALTITUDE_MAX = 1.85;
const REVEAL_ALTITUDE_DEFAULT = 0.45;

const MIN_AREA_KM2 = 1;
const MAX_AREA_KM2 = 17_000_000;
const MIN_SPAN_KM = 3;
const MAX_SPAN_KM = 3_500;

export interface GlobeFlyAltitudeInput {
  areaKm2?: number;
  spanKm?: number;
  /** Close-up when the player taps “Show on globe”. */
  reveal?: boolean;
}

export function globeFlyAltitude(input: GlobeFlyAltitudeInput): number {
  if (!input.reveal) {
    return GLOBE_FLY_ALTITUDE_ROUND;
  }
  const fromArea =
    input.areaKm2 !== undefined && input.areaKm2 > 0
      ? revealAltitudeFromMetric(input.areaKm2, MIN_AREA_KM2, MAX_AREA_KM2)
      : undefined;
  const fromSpan =
    input.spanKm !== undefined && input.spanKm > 0
      ? revealAltitudeFromMetric(input.spanKm, MIN_SPAN_KM, MAX_SPAN_KM)
      : undefined;
  if (fromArea === undefined && fromSpan === undefined) {
    return REVEAL_ALTITUDE_DEFAULT;
  }
  if (fromArea === undefined) {
    return fromSpan!;
  }
  if (fromSpan === undefined) {
    return fromArea;
  }
  return Math.min(fromArea, fromSpan);
}

/** Minimum OrbitControls distance that still allows the reveal camera pose. */
export function globeRevealMinControlDistance(cameraDistance: number): number {
  return Math.max(82, Math.min(160, cameraDistance * 0.72));
}

export function globeFeatureBBoxSpanKm(
  feature: GlobeCountryFeature | undefined,
  refLat: number,
): number | undefined {
  if (!feature?.geometry) {
    return undefined;
  }
  const bounds = geometryBounds(feature.geometry.coordinates);
  if (!bounds) {
    return undefined;
  }
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const dLatKm = (maxLat - minLat) * 111;
  const midLat = (minLat + maxLat) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180);
  const dLngKm = (maxLng - minLng) * 111 * Math.max(0.15, Math.abs(lngScale));
  return Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);
}

function revealAltitudeFromMetric(
  value: number,
  minMetric: number,
  maxMetric: number,
): number {
  const clamped = Math.max(minMetric, Math.min(maxMetric, value));
  const t =
    (Math.log(clamped) - Math.log(minMetric)) / (Math.log(maxMetric) - Math.log(minMetric));
  return REVEAL_ALTITUDE_MIN + t * (REVEAL_ALTITUDE_MAX - REVEAL_ALTITUDE_MIN);
}

interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function geometryBounds(coords: unknown): GeoBounds | undefined {
  const bounds: GeoBounds = {
    minLat: 90,
    maxLat: -90,
    minLng: 180,
    maxLng: -180,
  };
  let touched = false;
  const visit = (node: unknown): void => {
    if (!Array.isArray(node) || node.length === 0) {
      return;
    }
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      const lng = node[0] as number;
      const lat = node[1] as number;
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
      bounds.minLng = Math.min(bounds.minLng, lng);
      bounds.maxLng = Math.max(bounds.maxLng, lng);
      touched = true;
      return;
    }
    for (const child of node) {
      visit(child);
    }
  };
  visit(coords);
  return touched ? bounds : undefined;
}
