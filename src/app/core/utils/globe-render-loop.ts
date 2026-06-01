import { NgZone } from '@angular/core';

/**
 * Coalesced on-demand render scheduling outside Angular zone.
 * Pair with `__Zone_disable_requestAnimationFrame` in zone-flags for WebGL pages.
 */
export class GlobeRenderLoop {
  private rafId = 0;
  private active = false;
  private paused = false;

  constructor(
    private readonly ngZone: NgZone,
    private readonly renderFrame: () => void,
  ) {}

  start(): void {
    this.active = true;
    this.requestRender();
  }

  stop(): void {
    this.active = false;
    this.cancelRaf();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.requestRender();
    }
  }

  requestRender(): void {
    if (!this.active || this.paused || this.rafId) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        if (this.active && !this.paused) {
          this.renderFrame();
        }
      });
    });
  }

  scheduleFrame(callback: (now: number) => void): number {
    let id = 0;
    this.ngZone.runOutsideAngular(() => {
      id = requestAnimationFrame((now) => callback(now));
    });
    return id;
  }

  cancelFrame(id: number): void {
    cancelAnimationFrame(id);
  }

  private cancelRaf(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}
