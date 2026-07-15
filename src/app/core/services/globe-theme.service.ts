import { Injectable, inject, signal } from '@angular/core';

import {
  globeThemePalette,
  parseGlobeTheme,
  type GlobeThemeId,
  type GlobeThemePalette,
} from '../data/globe-theme';
import { AppSettingsService } from './app-settings.service';

@Injectable({ providedIn: 'root' })
export class GlobeThemeService {
  private readonly appSettings = inject(AppSettingsService);

  private readonly themeSig = signal<GlobeThemeId>('classic');

  /** Current globe / map country color preset. */
  readonly theme = this.themeSig.asReadonly();

  palette(): GlobeThemePalette {
    return globeThemePalette(this.themeSig());
  }

  async hydrate(): Promise<void> {
    const settings = await this.appSettings.load();
    this.themeSig.set(settings.globeTheme);
  }

  async setTheme(theme: GlobeThemeId): Promise<void> {
    this.themeSig.set(theme);
    const prev = await this.appSettings.load();
    await this.appSettings.save({ ...prev, globeTheme: theme });
  }
}
