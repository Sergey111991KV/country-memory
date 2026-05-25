import { environment } from '../../../environments/environment';

/** Dev-only logs for play flow debugging (hub → session → game pages). */
export function playDebug(scope: string, message: string, data?: unknown): void {
  if (environment.production) {
    return;
  }
  if (data !== undefined) {
    console.log(`[Flagfield Play][${scope}]`, message, data);
    return;
  }
  console.log(`[Flagfield Play][${scope}]`, message);
}
