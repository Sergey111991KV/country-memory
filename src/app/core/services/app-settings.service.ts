import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';

const KEY = 'app_settings_v2';

export type HeroTypography = 'compact' | 'comfortable' | 'large';

export type BodyTypography = 'default' | 'comfortable' | 'accessible';

export type ColorPalette = 'ocean' | 'forest' | 'sunset' | 'classic';

export interface AppSettings {
  primaryPlayerName: string;
  heroTypography: HeroTypography;
  bodyTypography: BodyTypography;
  colorPalette: ColorPalette;
}

const DEFAULT_PLAYER = 'Player';

export function applyBodyTypographyClass(t: BodyTypography): void {
  if (typeof document === 'undefined') {
    return;
  }
  const el = document.documentElement;
  el.classList.remove('app-body-default', 'app-body-comfortable', 'app-body-accessible');
  const key: BodyTypography =
    t === 'comfortable' || t === 'accessible' ? t : 'default';
  el.classList.add(`app-body-${key}`);
}

export function applyColorPaletteClass(palette: ColorPalette): void {
  if (typeof document === 'undefined') {
    return;
  }
  const el = document.documentElement;
  el.classList.remove(
    'palette-ocean',
    'palette-forest',
    'palette-sunset',
    'palette-classic',
  );
  el.classList.add(`palette-${palette}`);
}

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly storage = inject(StorageService);

  private defaultSettings(): AppSettings {
    return {
      primaryPlayerName: DEFAULT_PLAYER,
      heroTypography: 'comfortable',
      bodyTypography: 'default',
      colorPalette: 'ocean',
    };
  }

  async load(): Promise<AppSettings> {
    const raw = await this.storage.get<Partial<AppSettings>>(KEY);
    const base = this.defaultSettings();
    if (!raw) {
      return base;
    }
    const heroTypography =
      raw.heroTypography === 'compact' ||
      raw.heroTypography === 'comfortable' ||
      raw.heroTypography === 'large'
        ? raw.heroTypography
        : base.heroTypography;
    const bodyTypography =
      raw.bodyTypography === 'comfortable' || raw.bodyTypography === 'accessible'
        ? raw.bodyTypography
        : base.bodyTypography;
    const colorPalette =
      raw.colorPalette === 'forest' ||
      raw.colorPalette === 'sunset' ||
      raw.colorPalette === 'classic'
        ? raw.colorPalette
        : base.colorPalette;
    const name =
      typeof raw.primaryPlayerName === 'string' && raw.primaryPlayerName.trim()
        ? raw.primaryPlayerName.trim()
        : base.primaryPlayerName;
    return {
      primaryPlayerName: name,
      heroTypography,
      bodyTypography,
      colorPalette,
    };
  }

  async save(next: AppSettings): Promise<void> {
    await this.storage.set(KEY, next);
  }
}
