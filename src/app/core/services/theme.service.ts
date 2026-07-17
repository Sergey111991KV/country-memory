import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { StorageService } from './storage.service';

export type AppTheme = 'light' | 'dark';

const KEY = 'app_theme_v1';
const LIGHT_DEFAULT_MIGRATION_KEY = 'app_theme_light_default_v2';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);
  private theme: AppTheme = 'light';
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const raw = await this.storage.get<string>(KEY);
    const migrated = await this.storage.get<string>(LIGHT_DEFAULT_MIGRATION_KEY);
    if (!migrated) {
      await this.storage.set(LIGHT_DEFAULT_MIGRATION_KEY, '1');
      // Previous builds defaulted to dark; promote light as the main theme once.
      if (raw !== 'light') {
        this.theme = 'light';
        await this.storage.set(KEY, 'light');
      }
    } else if (raw === 'light' || raw === 'dark') {
      this.theme = raw;
    }
    this.applyToDocument();
    this.hydrated = true;
  }

  get currentTheme(): AppTheme {
    return this.theme;
  }

  async setTheme(next: AppTheme): Promise<void> {
    this.theme = next;
    await this.storage.set(KEY, next);
    this.applyToDocument();
  }

  private applyToDocument(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    const dark = this.theme === 'dark';
    root.classList.toggle('ion-palette-dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';

    if (dark) {
      root.style.setProperty('--ion-background-color', '#070b14');
      root.style.setProperty('--ion-text-color', '#f1f5f9');
      root.style.setProperty('--ion-color-primary', '#38bdf8');
      root.style.setProperty('--ion-color-primary-rgb', '56, 189, 248');
      root.style.setProperty('--ion-color-primary-contrast', '#070b14');
      root.style.setProperty('--ion-color-secondary', '#67e8f9');
      root.style.setProperty('--ion-color-secondary-rgb', '103, 232, 249');
      root.style.setProperty('--ion-color-tertiary', '#2dd4bf');
      root.style.setProperty('--ion-color-success', '#4ade80');
      root.style.setProperty('--ion-color-warning', '#fbbf24');
      root.style.setProperty('--ion-color-danger', '#f87171');
      root.style.setProperty('--game-ink', '#f1f5f9');
      root.style.setProperty('--premium-bg', '#070b14');
      root.style.setProperty('--premium-card', '#121a28');
      root.style.setProperty('--premium-muted', '#94a3b8');
      root.style.setProperty(
        '--premium-gradient',
        'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 50%, #0ea5e9 100%)',
      );
    } else {
      root.style.setProperty('--ion-background-color', '#e8f3fb');
      root.style.setProperty('--ion-text-color', '#0f172a');
      root.style.setProperty('--ion-color-primary', '#0284c7');
      root.style.setProperty('--ion-color-primary-rgb', '2, 132, 199');
      root.style.setProperty('--ion-color-primary-contrast', '#ffffff');
      root.style.setProperty('--ion-color-secondary', '#0ea5e9');
      root.style.setProperty('--ion-color-secondary-rgb', '14, 165, 233');
      root.style.setProperty('--ion-color-tertiary', '#14b8a6');
      root.style.setProperty('--ion-color-success', '#16a34a');
      root.style.setProperty('--ion-color-warning', '#d97706');
      root.style.setProperty('--ion-color-danger', '#dc2626');
      root.style.setProperty('--game-ink', '#0f172a');
      root.style.setProperty('--premium-bg', '#e8f3fb');
      root.style.setProperty('--premium-card', '#f0f9ff');
      root.style.setProperty('--premium-muted', '#64748b');
      root.style.setProperty(
        '--premium-gradient',
        'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 55%, #0284c7 100%)',
      );
    }

    void this.syncStatusBar();
  }

  private async syncStatusBar(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await StatusBar.setStyle({
        style: this.theme === 'dark' ? Style.Dark : Style.Light,
      });
    } catch {
      /* web / unsupported */
    }
  }
}
