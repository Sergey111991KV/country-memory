import { Injectable } from '@angular/core';

import type { ContinentId } from '../data/country.types';
import type {
  CountrySceneAssets,
  CountrySceneManifest,
} from '../data/country-scene.types';

const CONTINENT_PALETTE: Record<
  ContinentId,
  { accent: string; accentSoft: string }
> = {
  africa: { accent: '#d4a574', accentSoft: '#3d2914' },
  asia: { accent: '#7cb89a', accentSoft: '#1a3328' },
  europe: { accent: '#8eb4dc', accentSoft: '#1a2a3d' },
  oceania: { accent: '#b8a0d8', accentSoft: '#2a2240' },
  americas: { accent: '#c9906a', accentSoft: '#3a2418' },
  other: { accent: '#94a3b8', accentSoft: '#1e293b' },
};

@Injectable({ providedIn: 'root' })
export class CountrySceneService {
  private manifest: CountrySceneManifest | null = null;
  private manifestPromise: Promise<CountrySceneManifest> | null = null;

  resolveAssets(iso2: string, continent: ContinentId): CountrySceneAssets {
    const code = iso2.trim().toUpperCase();
    const lower = code.toLowerCase();
    const entry = this.manifest?.scenes[code];
    const palette = CONTINENT_PALETTE[continent] ?? CONTINENT_PALETTE.other;

    return {
      iso2: code,
      videoUrl: entry?.video ?? `assets/country-scenes/${lower}.mp4`,
      posterUrl: entry?.poster ?? `assets/country-scenes/${lower}-poster.jpg`,
      accent: palette.accent,
      accentSoft: palette.accentSoft,
    };
  }

  async ensureManifest(): Promise<void> {
    await this.loadManifest();
  }

  /** Returns true when the URL loads as playable video metadata. */
  async probeVideo(url: string): Promise<boolean> {
    if (!url) {
      return false;
    }
    return new Promise<boolean>((resolve) => {
      const video = document.createElement('video');
      const finish = (ok: boolean): void => {
        video.removeAttribute('src');
        video.load();
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), 2500);
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        window.clearTimeout(timer);
        finish(true);
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      video.src = url;
    });
  }

  async probeImage(url: string): Promise<boolean> {
    if (!url) {
      return false;
    }
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      const timer = window.setTimeout(() => resolve(false), 2500);
      img.onload = () => {
        window.clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(false);
      };
      img.src = url;
    });
  }

  private async loadManifest(): Promise<CountrySceneManifest> {
    if (this.manifest) {
      return this.manifest;
    }
    if (!this.manifestPromise) {
      this.manifestPromise = fetch('assets/country-scenes/manifest.json')
        .then(async (res) => {
          if (!res.ok) {
            return { version: 1, scenes: {} };
          }
          return (await res.json()) as CountrySceneManifest;
        })
        .catch(() => ({ version: 1, scenes: {} }));
    }
    this.manifest = await this.manifestPromise;
    return this.manifest;
  }
}
