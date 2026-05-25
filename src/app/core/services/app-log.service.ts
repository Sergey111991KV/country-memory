import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

const LOG_STORAGE_KEY = 'flagfield_app_logs_v1';
const MAX_ENTRIES = 500;

export type AppLogLevel = 'info' | 'warn' | 'error';

export interface AppLogEntry {
  ts: string;
  level: AppLogLevel;
  category: string;
  message: string;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
export class AppLogService {
  private readonly storage = inject(StorageService);

  private entries: AppLogEntry[] = [];
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const raw = await this.storage.get<AppLogEntry[]>(LOG_STORAGE_KEY);
    this.entries = Array.isArray(raw) ? raw.slice(-MAX_ENTRIES) : [];
    this.hydrated = true;
  }

  async log(
    category: string,
    message: string,
    data?: unknown,
    level: AppLogLevel = 'info',
  ): Promise<void> {
    await this.hydrate();
    const entry: AppLogEntry = {
      ts: new Date().toISOString(),
      level,
      category,
      message,
      data: data === undefined ? undefined : this.safeData(data),
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    await this.storage.set(LOG_STORAGE_KEY, this.entries);

    if (!environment.production || environment.billingDebugEnabled) {
      const prefix = `[Flagfield][${category}]`;
      if (level === 'error') {
        console.error(prefix, message, data);
      } else if (level === 'warn') {
        console.warn(prefix, message, data);
      } else {
        console.log(prefix, message, data);
      }
    }
  }

  exportText(): string {
    const header = [
      'Flagfield application log',
      `App version: ${environment.appVersion}`,
      `Exported: ${new Date().toISOString()}`,
      `Entries: ${this.entries.length}`,
      '',
    ].join('\n');

    const body = this.entries
      .map((e) => {
        const dataLine =
          e.data === undefined ? '' : `\n  data: ${JSON.stringify(e.data)}`;
        return `${e.ts} [${e.level}] [${e.category}] ${e.message}${dataLine}`;
      })
      .join('\n');

    return `${header}\n${body}\n`;
  }

  async downloadLogFile(): Promise<'ok' | 'error'> {
    await this.hydrate();
    try {
      const text = this.exportText();
      const filename = `flagfield-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;

      if (typeof document !== 'undefined') {
        this.downloadInBrowser(text, filename);
      } else {
        throw new Error('Download unavailable');
      }

      if (Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: filename, text: text.slice(0, 50_000) });
        } catch {
          /* user dismissed share sheet — file already downloaded */
        }
      }

      await this.log('support', 'Log file exported', { filename });
      return 'ok';
    } catch (err) {
      await this.log(
        'support',
        'Log export failed',
        { error: err instanceof Error ? err.message : String(err) },
        'error',
      );
      return 'error';
    }
  }

  async clearLogs(): Promise<void> {
    this.entries = [];
    this.hydrated = true;
    await this.storage.remove(LOG_STORAGE_KEY);
  }

  private downloadInBrowser(text: string, filename: string): void {
    if (typeof document === 'undefined') {
      throw new Error('Browser download unavailable');
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private safeData(data: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }
}
