import type { Object3D } from 'three';

import type { GlobeCountryFeature } from './globe-geo';

type DigestData = {
  data?: GlobeCountryFeature;
};

type GlobeObject3D = Object3D & {
  __data?: DigestData;
};

/** Resolve country feature from a three-globe polygon mesh hit (see ThreeDigest `__data`). */
export function countryFeatureFromObject(obj: Object3D): GlobeCountryFeature | null {
  let current: Object3D | null = obj;
  while (current) {
    const wrapped = (current as GlobeObject3D).__data;
    if (wrapped?.data) {
      return wrapped.data;
    }
    current = current.parent;
  }
  return null;
}
