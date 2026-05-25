/** Per-country AI / illustrated scene assets (optional). */
export interface CountrySceneEntry {
  video?: string;
  poster?: string;
}

export interface CountrySceneManifest {
  version: number;
  scenes: Record<string, CountrySceneEntry>;
}

export interface CountrySceneAssets {
  iso2: string;
  videoUrl: string | null;
  posterUrl: string | null;
  accent: string;
  accentSoft: string;
}
