import { Injectable, inject } from '@angular/core';

import type { VisualQuality } from '../data/visual-quality';
import { parseVisualQuality } from '../data/visual-quality';
import type { GlobeThemeId } from '../data/globe-theme';
import { parseGlobeTheme } from '../data/globe-theme';
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
  /** Globe polygon detail + flag animation intensity. */
  visualQuality: VisualQuality;
  /** Country fill colors on globe and map quests. */
  globeTheme: GlobeThemeId;
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

  private cached: AppSettings | null = null;

  private defaultSettings(): AppSettings {
    return {
      primaryPlayerName: DEFAULT_PLAYER,
      heroTypography: 'comfortable',
      bodyTypography: 'default',
      colorPalette: 'ocean',
      visualQuality: 'balanced',
      globeTheme: 'classic',
    };
  }

  async load(): Promise<AppSettings> {
    if (this.cached) {
      return this.cached;
    }
    const raw = await this.storage.get<Partial<AppSettings>>(KEY);
    const base = this.defaultSettings();
    if (!raw) {
      this.cached = base;
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
    this.cached = {
      primaryPlayerName: name,
      heroTypography,
      bodyTypography,
      colorPalette,
      visualQuality: parseVisualQuality(raw.visualQuality),
      globeTheme: parseGlobeTheme(raw.globeTheme),
    };
    return this.cached;
  }

  async save(next: AppSettings): Promise<void> {
    this.cached = next;
    await this.storage.set(KEY, next);
  }
}
