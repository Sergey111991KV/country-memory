import { ApplicationRef, Injectable, inject } from '@angular/core';

import type { AppLang } from '../i18n/messages';
import { MESSAGES } from '../i18n/messages';

import { StorageService } from './storage.service';

const KEY = 'app_locale_v1';

/** BCP-47 primary subtag detection order (first match wins). */
const NAV_LANG_ORDER: AppLang[] = [
  'zh',
  'hi',
  'ar',
  'pt',
  'ja',
  'ko',
  'it',
  'tr',
  'vi',
  'id',
  'pl',
  'nl',
  'bn',
  'ur',
  'ru',
  'es',
  'de',
  'fr',
  'uk',
];

function detectLangFromNavigator(): AppLang {
  const n = navigator.language?.toLowerCase() ?? 'en';
  if (n === 'ua' || n.startsWith('ua-')) {
    return 'uk';
  }
  for (const code of NAV_LANG_ORDER) {
    if (n === code || n.startsWith(`${code}-`)) {
      return code;
    }
  }
  return 'en';
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) {
    return template;
  }
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly storage = inject(StorageService);
  private readonly appRef = inject(ApplicationRef);
  private lang: AppLang = 'en';
  private hydrated = false;

  /** Call once at startup before first translated UI. */
  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const raw = await this.storage.get<string>(KEY);
    if (raw && raw in MESSAGES) {
      this.lang = raw as AppLang;
    } else if (typeof navigator !== 'undefined') {
      this.lang = detectLangFromNavigator();
    }
    this.applyDocumentLang();
    this.hydrated = true;
  }

  get language(): AppLang {
    return this.lang;
  }

  translate(key: string, vars?: Record<string, string | number>): string {
    const table = MESSAGES[this.lang] ?? MESSAGES.en;
    const fallback = MESSAGES.en[key];
    const raw = table[key] ?? fallback ?? key;
    return interpolate(raw, vars);
  }

  async setLanguage(code: AppLang): Promise<void> {
    if (!(code in MESSAGES)) {
      return;
    }
    this.lang = code;
    await this.storage.set(KEY, code);
    this.applyDocumentLang();
    this.appRef.tick();
  }

  private applyDocumentLang(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = this.lang;
    const rtl = this.lang === 'ar' || this.lang === 'ur';
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }
}
