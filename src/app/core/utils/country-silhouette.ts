/** Projects a country (Multi)Polygon into an SVG path for the silhouette game. */

type Ring = number[][];
type PolygonCoords = Ring[];

interface SilhouetteGeometry {
  type: string;
  coordinates: unknown;
}

export interface CountrySilhouette {
  path: string;
  viewBox: string;
}

function polygonsOf(geometry: SilhouetteGeometry): PolygonCoords[] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates as PolygonCoords];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates as PolygonCoords[];
  }
  return [];
}

function ringAreaDeg(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j]![0]! + ring[i]![0]!) * (ring[j]![1]! - ring[i]![1]!);
  }
  return Math.abs(a / 2);
}

/**
 * Equirectangular projection scaled by cos(latitude) so shapes are not stretched.
 * Tiny far-flung islands (< `minPartShare` of the main landmass) are dropped so the
 * outline stays recognisable (e.g. France without overseas territories).
 */
export function countrySilhouette(
  geometry: SilhouetteGeometry | null | undefined,
  size = 100,
  minPartShare = 0.02,
): CountrySilhouette | null {
  if (!geometry) {
    return null;
  }
  const polys = polygonsOf(geometry).filter((p) => p[0] && p[0].length > 2);
  if (polys.length === 0) {
    return null;
  }
  const areas = polys.map((p) => ringAreaDeg(p[0]!));
  const largest = Math.max(...areas);
  const mainIdx = areas.indexOf(largest);
  const main = polys[mainIdx]![0]!;
  const mainLng = main.reduce((s, c) => s + c[0]!, 0) / main.length;

  // Keep parts that are big enough and not on the other side of the world.
  const kept = polys.filter((p, i) => {
    if (i === mainIdx) {
      return true;
    }
    if (areas[i]! < largest * minPartShare) {
      return false;
    }
    const lng = p[0]!.reduce((s, c) => s + c[0]!, 0) / p[0]!.length;
    return Math.abs(lng - mainLng) < 60;
  });

  // Unwrap longitudes around the main landmass (antimeridian, e.g. Russia / Fiji).
  const unwrap = (lng: number): number => {
    let x = lng;
    while (x - mainLng > 180) x -= 360;
    while (x - mainLng < -180) x += 360;
    return x;
  };

  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of kept) {
    for (const [, lat] of p[0]!) {
      minLat = Math.min(minLat, lat!);
      maxLat = Math.max(maxLat, lat!);
    }
  }
  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)) || 1;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const projected = kept.map((poly) =>
    poly.map((ring) =>
      ring.map(([lng, lat]) => {
        const x = unwrap(lng!) * k;
        const y = -lat!;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        return [x, y] as const;
      }),
    ),
  );
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = size / span;
  const offX = (size - (maxX - minX) * scale) / 2;
  const offY = (size - (maxY - minY) * scale) / 2;
  const fmt = (n: number): string => n.toFixed(2);

  const parts: string[] = [];
  for (const poly of projected) {
    for (const ring of poly) {
      parts.push(
        ring
          .map(
            ([x, y], i) =>
              `${i === 0 ? 'M' : 'L'}${fmt((x - minX) * scale + offX)} ${fmt((y - minY) * scale + offY)}`,
          )
          .join('') + 'Z',
      );
    }
  }
  return { path: parts.join(''), viewBox: `0 0 ${size} ${size}` };
}
