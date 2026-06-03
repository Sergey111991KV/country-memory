import { LineBasicMaterial, Mesh, MeshBasicMaterial, type Object3D } from 'three';

import { parseCssRgba, refreshGlobePolygonColors } from './globe-polygon-colors';
import type { GlobeCountryFeature } from './globe-geo';

function mockPolygonGroup(iso2: string, continent: string): Object3D {
  const feature: GlobeCountryFeature = {
    type: 'Feature',
    properties: { 'ISO3166-1-Alpha-2': iso2, CONTINENT: continent },
    geometry: { type: 'Polygon', coordinates: [] },
  };
  const capMat = new MeshBasicMaterial({ color: 0xffffff });
  const sideMat = new MeshBasicMaterial({ color: 0x333333 });
  const conic = new Mesh(undefined, [sideMat, capMat]);
  const stroke = new Mesh(undefined, new LineBasicMaterial({ color: 0x000000 }));
  stroke.visible = true;

  const group = {
    __globeObjType: 'polygon',
    __data: { data: feature },
    children: [conic, stroke],
    traverse: (fn: (o: Object3D) => void) => {
      fn(group as unknown as Object3D);
    },
  };
  return group as unknown as Object3D;
}

describe('parseCssRgba', () => {
  it('parses rgba with alpha', () => {
    expect(parseCssRgba('rgba(15, 23, 42, 0.55)')).toEqual({
      r: 15 / 255,
      g: 23 / 255,
      b: 42 / 255,
      a: 0.55,
    });
  });
});

describe('refreshGlobePolygonColors', () => {
  it('updates cap color for selected country without throwing', () => {
    const root = mockPolygonGroup('DE', 'Europe');
    expect(() =>
      refreshGlobePolygonColors(root, {
        selectedIso: 'DE',
        feedbackCorrectIso: null,
        feedbackWrongIso: null,
        phase: 'pick',
      }),
    ).not.toThrow();
    const cap = (root.children[0] as Mesh).material as MeshBasicMaterial[];
    expect(cap[1].color).toBeDefined();
  });
});
