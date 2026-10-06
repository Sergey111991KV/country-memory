import { Injectable } from '@angular/core';

export type RemoteFlagWidth = 160 | 320 | 640;

/**
 * Country flags.
 *
 * Flags ship with the app (`assets/flags/{iso2}.svg`, built by
 * `npm run assets:flags`) so they show offline and on networks that block or
 * throttle the CDN. FlagCDN is only a fallback if a bundled file fails to load.
 */
@Injectable({ providedIn: 'root' })
export class FlagAssetsService {
  /** Large hero flag for quiz and country reveals. */
  heroUrl(iso2: string): string {
    return this.localUrl(iso2);
  }

  /** Medium flag for cards and feedback panels. */
  cardUrl(iso2: string): string {
    return this.localUrl(iso2);
  }

  /** Bundled vector flag (true proportions). */
  localUrl(iso2: string): string {
    const code = this.code(iso2);
    return code ? `assets/flags/${code}.svg` : '';
  }

  /** FlagCDN raster fallback. */
  remoteUrl(iso2: string, width: RemoteFlagWidth): string {
    const code = this.code(iso2);
    return code ? `https://flagcdn.com/w${width}/${code}.png` : '';
  }

  /**
   * Ordered sources to try: bundled SVG first, then CDN sizes.
   * `attempt` past the end returns '' (show the fallback glyph).
   */
  sourceForAttempt(iso2: string, attempt: number, large = true): string {
    const chain = [
      this.localUrl(iso2),
      this.remoteUrl(iso2, large ? 640 : 320),
      this.remoteUrl(iso2, large ? 320 : 160),
    ];
    return chain[attempt] ?? '';
  }

  private code(iso2: string): string {
    const code = (iso2 ?? '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(code) ? code : '';
  }
}
