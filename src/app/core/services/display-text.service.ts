import { Injectable, inject } from '@angular/core';

import { LocaleService } from './locale.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'display_text_overrides_v1';

/** i18n keys users may override from Settings (empty string = use translation). */
export const CUSTOMIZABLE_TEXT_KEYS = [
  'home.heroTitle',
  'home.heroSub',
  'home.heroSubShort',
] as const;

export type CustomizableTextKey = (typeof CUSTOMIZABLE_TEXT_KEYS)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

@Injectable({ providedIn: 'root' })
export class DisplayTextService {
  private readonly storage = inject(StorageService);
  private readonly i18n = inject(LocaleService);

  private overrides: Partial<Record<CustomizableTextKey, string>> = {};
  private loaded = false;

  async hydrate(): Promise<void> {
    const raw = await this.storage.get<unknown>(STORAGE_KEY);
    this.overrides = {};
    if (isRecord(raw)) {
      for (const k of CUSTOMIZABLE_TEXT_KEYS) {
        const v = raw[k];
        if (typeof v === 'string' && v.trim()) {
          this.overrides[k] = v.trim();
        }
      }
    }
    this.loaded = true;
  }

  /** Resolved line: custom text if set, otherwise current locale string. */
  effective(key: CustomizableTextKey): string {
    const o = this.overrides[key];
    if (o && o.length > 0) {
      return o;
    }
    return this.i18n.translate(key);
  }

  getOverride(key: CustomizableTextKey): string {
    return this.overrides[key] ?? '';
  }

  async setOverride(key: CustomizableTextKey, value: string): Promise<void> {
    const next = { ...this.overrides };
    const t = value.trim();
    if (t) {
      next[key] = t;
    } else {
      delete next[key];
    }
    this.overrides = next;
    await this.storage.set(STORAGE_KEY, next);
  }

  async clearAll(): Promise<void> {
    this.overrides = {};
    await this.storage.remove(STORAGE_KEY);
  }

  defaultFor(key: CustomizableTextKey): string {
    return this.i18n.translate(key);
  }

  ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return Promise.resolve();
    }
    return this.hydrate();
  }
}
