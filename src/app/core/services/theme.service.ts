import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { StorageService } from './storage.service';

export type AppTheme = 'light' | 'dark';

const KEY = 'app_theme_v1';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);
  private theme: AppTheme = 'dark';
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const raw = await this.storage.get<string>(KEY);
    if (raw === 'light' || raw === 'dark') {
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
      root.style.setProperty('--ion-background-color', '#0b0814');
      root.style.setProperty('--ion-text-color', '#ffffff');
      root.style.setProperty('--ion-color-primary', '#a78bfa');
      root.style.setProperty('--ion-color-primary-rgb', '167, 139, 250');
      root.style.setProperty('--ion-color-primary-contrast', '#0b0814');
      root.style.setProperty('--ion-color-secondary', '#22d3ee');
      root.style.setProperty('--ion-color-secondary-rgb', '34, 211, 238');
      root.style.setProperty('--ion-color-tertiary', '#ec4899');
      root.style.setProperty('--ion-color-success', '#4ade80');
      root.style.setProperty('--ion-color-warning', '#fbbf24');
      root.style.setProperty('--ion-color-danger', '#f87171');
      root.style.setProperty('--game-ink', '#ffffff');
      root.style.setProperty('--premium-bg', '#0b0814');
      root.style.setProperty('--premium-card', '#16122b');
      root.style.setProperty('--premium-muted', '#a1a1aa');
      root.style.setProperty('--premium-gradient', 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)');
    } else {
      root.style.setProperty('--ion-color-primary', '#4f46e5');
      root.style.setProperty('--ion-color-primary-rgb', '79, 70, 229');
      root.style.setProperty('--ion-color-primary-contrast', '#ffffff');
      root.style.setProperty('--ion-color-secondary', '#0ea5e9');
      root.style.setProperty('--ion-color-secondary-rgb', '14, 165, 233');
      root.style.setProperty('--ion-color-tertiary', '#db2777');
      root.style.setProperty('--ion-color-success', '#16a34a');
      root.style.setProperty('--ion-color-warning', '#d97706');
      root.style.setProperty('--ion-color-danger', '#dc2626');
      root.style.setProperty('--game-ink', '#0f172a');
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
