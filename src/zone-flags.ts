/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
// eslint-disable-next-line no-underscore-dangle
(window as any).__Zone_disable_customElements = true;

/** WebGL / Three.js schedules its own rAF loops; patching causes [Violation] spam. */
// eslint-disable-next-line no-underscore-dangle
(window as any).__Zone_disable_requestAnimationFrame = true;
