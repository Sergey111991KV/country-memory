import type { LineBasicMaterial, Mesh, MeshBasicMaterial, Object3D } from 'three';

import {
  type GlobeCountryFeature,
  type GlobePolygonColorState,
  iso2FromNaturalEarth,
  politicalCapColor,
  politicalStrokeColor,
} from './globe-geo';

type GlobePolygonObject = Object3D & {
  __globeObjType?: string;
  __data?: { data?: GlobeCountryFeature };
};

export interface ParsedRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses `rgb()` / `rgba()` for Three.js (Color.setStyle ignores alpha). */
export function parseCssRgba(css: string): ParsedRgba | null {
  const match = css.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (!match) {
    return null;
  }
  return {
    r: Number(match[1]) / 255,
    g: Number(match[2]) / 255,
    b: Number(match[3]) / 255,
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

function applyCssColor(material: MeshBasicMaterial | LineBasicMaterial, css: string): void {
  const rgba = parseCssRgba(css);
  if (!rgba) {
    return;
  }
  material.color.setRGB(rgba.r, rgba.g, rgba.b);
  material.transparent = rgba.a < 1;
  material.opacity = rgba.a;
}

export interface RefreshGlobePolygonColorsOptions {
  /** When set, only these ISO codes are updated (much faster on tap). */
  onlyIsos?: ReadonlySet<string>;
}

/**
 * Updates cap/stroke materials in place (no polygonsData digest).
 * three-globe polygon group layout: [conicMesh, strokeLines].
 */
export function refreshGlobePolygonColors(
  globeRoot: Object3D,
  state: GlobePolygonColorState,
  options?: RefreshGlobePolygonColorsOptions,
): void {
  const onlyIsos = options?.onlyIsos;
  globeRoot.traverse((obj) => {
    const node = obj as GlobePolygonObject;
    if (node.__globeObjType !== 'polygon') {
      return;
    }
    const feature = node.__data?.data;
    if (!feature) {
      return;
    }
    if (onlyIsos) {
      const iso = iso2FromNaturalEarth(feature.properties);
      if (!iso || !onlyIsos.has(iso)) {
        return;
      }
    }

    const capColor = politicalCapColor(feature, state);
    const strokeColor = politicalStrokeColor(feature, state);
    const conic = node.children[0] as Mesh | undefined;
    const stroke = node.children[1] as Mesh | undefined;

    if (conic?.material) {
      const materials = Array.isArray(conic.material) ? conic.material : [conic.material];
      const capMaterial = materials[materials.length - 1] as MeshBasicMaterial;
      if (capMaterial?.color) {
        applyCssColor(capMaterial, capColor);
      }
    }

    if (stroke?.visible && stroke.material) {
      const strokeMaterial = stroke.material as LineBasicMaterial;
      if (strokeMaterial.color) {
        applyCssColor(strokeMaterial, strokeColor);
      }
    }
  });
}
