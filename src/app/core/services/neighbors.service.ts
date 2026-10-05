import { Injectable } from '@angular/core';

const URL = 'assets/data/neighbors.json';

/** Land borders (built by scripts/build-neighbors.mjs from the globe GeoJSON). */
@Injectable({ providedIn: 'root' })
export class NeighborsService {
  private map: Map<string, string[]> | null = null;
  private loading: Promise<void> | null = null;

  ensureLoaded(): Promise<void> {
    if (this.map) {
      return Promise.resolve();
    }
    this.loading ??= fetch(URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`neighbors HTTP ${res.status}`);
        }
        return res.json() as Promise<{ neighbors: Record<string, string[]> }>;
      })
      .then((file) => {
        this.map = new Map(Object.entries(file.neighbors));
      })
      .catch((err) => {
        this.loading = null;
        throw err;
      });
    return this.loading;
  }

  neighborsOf(iso2: string): string[] {
    return this.map?.get(iso2.toUpperCase()) ?? [];
  }

  areNeighbors(a: string, b: string): boolean {
    return this.neighborsOf(a).includes(b.toUpperCase());
  }
}
