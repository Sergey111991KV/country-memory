import type { LineBasicMaterial, Mesh, MeshBasicMaterial, Object3D } from 'three';

import {
  type GlobeCountryFeature,
  type GlobePolygonColorState,
  politicalCapColor,
  politicalStrokeColor,
} from './globe-geo';

type GlobePolygonObject = Object3D & {
  __globeObjType?: string;
  __data?: { data?: GlobeCountryFeature };
};

function applyCssColor(material: MeshBasicMaterial | LineBasicMaterial, css: string): void {
  material.color.setStyle(css);
  const alphaMatch = css.match(/rgba\s*\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/i);
  const alpha = alphaMatch ? Number(alphaMatch[1]) : 1;
  material.transparent = alpha < 1;
  material.opacity = alpha;
}

/**
 * Updates cap/stroke materials in place (no polygonsData digest).
 * three-globe polygon group layout: [conicMesh, strokeLines].
 */
export function refreshGlobePolygonColors(
  globeRoot: Object3D,
  state: GlobePolygonColorState,
): void {
  globeRoot.traverse((obj) => {
    const node = obj as GlobePolygonObject;
    if (node.__globeObjType !== 'polygon') {
      return;
    }
    const feature = node.__data?.data;
    if (!feature) {
      return;
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
