import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AppLogService } from './app-log.service';

/** Log perf spans to console (dev) and app log ring buffer when slow. */
const SLOW_CONSOLE_MS = 120;
const SLOW_APP_LOG_MS = 200;

export interface PerfSpan {
  end(extra?: Record<string, unknown>): number;
}

@Injectable({ providedIn: 'root' })
export class PerfLogService {
  private readonly appLog = inject(AppLogService);

  enabled(): boolean {
    return (
      environment.debugVerbose ||
      environment.billingDebugEnabled ||
      !environment.production
    );
  }

  span(scope: string, label: string): PerfSpan {
    const t0 = performance.now();
    return {
      end: (extra?: Record<string, unknown>): number => {
        const ms = performance.now() - t0;
        const payload = {
          ms: Math.round(ms * 10) / 10,
          ...extra,
        };
        if (this.enabled()) {
          const prefix = `[Flagfield Perf][${scope}] ${label}`;
          if (ms >= SLOW_CONSOLE_MS) {
            console.warn(prefix, payload);
          } else {
            console.log(prefix, payload);
          }
        }
        if (ms >= SLOW_APP_LOG_MS) {
          void this.appLog.log(
            'perf',
            `${scope}: ${label}`,
            payload,
            ms >= 500 ? 'warn' : 'info',
          );
        }
        return ms;
      },
    };
  }

  mark(scope: string, label: string, extra?: Record<string, unknown>): void {
    if (!this.enabled()) {
      return;
    }
    console.log(`[Flagfield Perf][${scope}] ${label}`, extra ?? '');
  }
}
