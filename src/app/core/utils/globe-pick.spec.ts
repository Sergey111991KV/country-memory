import type { Object3D } from 'three';

import { countryFeatureFromObject } from './globe-pick';

describe('globe-pick', () => {
  it('reads country from three-globe __data on parent', () => {
    const feature = {
      type: 'Feature' as const,
      properties: { ISO_A2: 'DE' },
      geometry: { type: 'Polygon', coordinates: [] },
    };
    const parent = {
      __data: { data: feature },
    } as Object3D & { __data: { data: typeof feature } };
    const mesh = { parent } as unknown as Object3D;

    expect(countryFeatureFromObject(mesh)).toBe(feature);
  });
});
