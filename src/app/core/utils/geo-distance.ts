/** Great-circle helpers for the hot/cold globe games (Globle-style). */

const EARTH_RADIUS_KM = 6371;
/** Half of Earth's circumference: the farthest two points can be. */
export const MAX_SURFACE_DISTANCE_KM = 20_015;

export type LngLat = [number, number];

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from point 1 to point 2, degrees clockwise from north (0–360). */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/** Eight-way arrow for a compass bearing. */
export function compassArrow(bearing: number): string {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return ARROWS[idx]!;
}

type Coordinates = number[] | Coordinates[];

function collectPoints(coords: Coordinates, out: LngLat[]): void {
  if (coords.length >= 2 && typeof coords[0] === 'number') {
    out.push([coords[0] as number, coords[1] as number]);
    return;
  }
  for (const c of coords as Coordinates[]) {
    collectPoints(c, out);
  }
}

/** Evenly sampled boundary vertices of a (Multi)Polygon, capped for fast distance checks. */
export function sampleGeometryPoints(
  geometry: { coordinates?: unknown } | null | undefined,
  maxPoints = 180,
): LngLat[] {
  if (!geometry?.coordinates) {
    return [];
  }
  const all: LngLat[] = [];
  collectPoints(geometry.coordinates as Coordinates, all);
  if (all.length <= maxPoints) {
    return all;
  }
  const step = all.length / maxPoints;
  const out: LngLat[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(all[Math.floor(i * step)]!);
  }
  return out;
}

/** Minimum distance between two sampled borders (approximates border-to-border distance). */
export function minPointSetDistanceKm(a: readonly LngLat[], b: readonly LngLat[]): number {
  let best = Infinity;
  for (const [lngA, latA] of a) {
    for (const [lngB, latB] of b) {
      const d = haversineKm(latA, lngA, latB, lngB);
      if (d < best) {
        best = d;
      }
    }
  }
  return best;
}

/** 0–100: how close a guess is (100 = touching / correct). */
export function proximityPercent(km: number): number {
  const ratio = Math.max(0, Math.min(1, km / MAX_SURFACE_DISTANCE_KM));
  return Math.round((1 - ratio) * 100);
}

const HEAT_STOPS: { km: number; rgb: [number, number, number] }[] = [
  { km: 0, rgb: [153, 27, 27] },
  { km: 500, rgb: [220, 38, 38] },
  { km: 1500, rgb: [249, 115, 22] },
  { km: 3500, rgb: [250, 204, 21] },
  { km: 7000, rgb: [253, 224, 71] },
  { km: 12000, rgb: [254, 249, 195] },
];

/** Hot (dark red, near) → cold (pale yellow, far) fill as `rgba()` for the globe. */
export function heatColor(km: number, alpha = 0.95): string {
  const d = Math.max(0, km);
  let lo = HEAT_STOPS[0]!;
  let hi = HEAT_STOPS[HEAT_STOPS.length - 1]!;
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (d >= HEAT_STOPS[i]!.km && d <= HEAT_STOPS[i + 1]!.km) {
      lo = HEAT_STOPS[i]!;
      hi = HEAT_STOPS[i + 1]!;
      break;
    }
  }
  if (d > hi.km) {
    lo = hi;
  }
  const t = hi.km === lo.km ? 0 : (d - lo.km) / (hi.km - lo.km);
  const mix = (i: number): number => Math.round(lo.rgb[i]! + (hi.rgb[i]! - lo.rgb[i]!) * t);
  return `rgba(${mix(0)}, ${mix(1)}, ${mix(2)}, ${alpha})`;
}

/** Emoji square for share cards. */
export function heatEmoji(km: number, correct = false): string {
  if (correct) {
    return '🟩';
  }
  if (km <= 0) {
    return '🟥';
  }
  if (km < 1000) {
    return '🟥';
  }
  if (km < 3000) {
    return '🟧';
  }
  if (km < 6000) {
    return '🟨';
  }
  return '⬜';
}
