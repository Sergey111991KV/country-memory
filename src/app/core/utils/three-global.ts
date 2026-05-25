type ThreeNamespace = typeof import('three');

declare global {
  interface Window {
    THREE?: ThreeNamespace;
  }
}

let threeBootstrap: Promise<ThreeNamespace> | null = null;

/** Ensures `window.THREE` is set before three-globe loads (deferred from main bundle). */
export function ensureThreeGlobal(): Promise<ThreeNamespace> {
  if (window.THREE) {
    return Promise.resolve(window.THREE);
  }
  if (!threeBootstrap) {
    threeBootstrap = import('three').then((THREE) => {
      window.THREE = THREE;
      return THREE;
    });
  }
  return threeBootstrap;
}
