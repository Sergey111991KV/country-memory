import { Injectable } from '@angular/core';

/** High-res flag images (FlagCDN — ISO 3166-1 alpha-2, lowercase). */
@Injectable({ providedIn: 'root' })
export class FlagAssetsService {
  /** Large hero flag for quiz and country reveals. */
  heroUrl(iso2: string): string {
    return this.url(iso2, 640);
  }

  /** Medium flag for cards and feedback panels. */
  cardUrl(iso2: string): string {
    return this.url(iso2, 320);
  }

  private url(iso2: string, width: 320 | 640): string {
    const code = iso2.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) {
      return '';
    }
    return `https://flagcdn.com/w${width}/${code}.png`;
  }
}
