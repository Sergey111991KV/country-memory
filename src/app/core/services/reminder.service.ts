import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { localDateKey } from '../utils/daily-seed';
import { DailyCountryService } from './daily-country.service';
import { LocaleService } from './locale.service';
import { StorageService } from './storage.service';

const KEY = 'flagfield_reminders_v1';
/** Notification ids owned by the reminder (today/tomorrow + day after). */
const IDS = [7001, 7002];

export interface ReminderPrefs {
  enabled: boolean;
  /** Local hour (0–23) for the daily reminder. */
  hour: number;
}

const DEFAULT_PREFS: ReminderPrefs = { enabled: false, hour: 19 };

/** Next reminder times: today at `hour` if still ahead and unsolved, else tomorrow (+1 backup day). */
export function reminderTimes(now: Date, hour: number, solvedToday: boolean): Date[] {
  const at = (dayOffset: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const today = at(0);
  const first = !solvedToday && today.getTime() > now.getTime() + 60_000 ? today : at(1);
  const second = new Date(first);
  second.setDate(second.getDate() + 1);
  return [first, second];
}

/**
 * Local "daily country / keep your streak" reminder (no server needed).
 * Rescheduled on app start, resume and after the daily puzzle is finished.
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly storage = inject(StorageService);
  private readonly daily = inject(DailyCountryService);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private listening = false;

  get supported(): boolean {
    return Capacitor.isNativePlatform();
  }

  async getPrefs(): Promise<ReminderPrefs> {
    return { ...DEFAULT_PREFS, ...((await this.storage.get<ReminderPrefs>(KEY)) ?? {}) };
  }

  /** Saves prefs; returns false if the OS denied notification permission. */
  async setPrefs(prefs: ReminderPrefs): Promise<boolean> {
    let next = prefs;
    if (prefs.enabled && this.supported) {
      const granted = await this.ensurePermission();
      if (!granted) {
        next = { ...prefs, enabled: false };
      }
    }
    await this.storage.set(KEY, next);
    await this.reschedule();
    return next.enabled === prefs.enabled;
  }

  async init(): Promise<void> {
    if (!this.supported) {
      return;
    }
    if (!this.listening) {
      this.listening = true;
      await LocalNotifications.addListener('localNotificationActionPerformed', () => {
        this.zone.run(() => {
          void this.router.navigate(['/tabs/play/globe-find', { variant: 'daily' }]);
        });
      });
    }
    await this.reschedule();
  }

  async reschedule(): Promise<void> {
    if (!this.supported) {
      return;
    }
    try {
      await LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) });
      const prefs = await this.getPrefs();
      if (!prefs.enabled) {
        return;
      }
      await this.daily.refresh();
      const status = this.daily.todayStatus();
      const solvedToday = status === 'solved' || status === 'gave_up';
      const streak = this.daily.streak().current;
      const times = reminderTimes(new Date(), prefs.hour, solvedToday);
      const title = this.locale.translate('notify.title');
      await LocalNotifications.schedule({
        notifications: times.map((at, i) => ({
          id: IDS[i]!,
          title,
          body:
            streak > 0 && i === 0
              ? this.locale.translate('notify.streakBody', { n: streak })
              : this.locale.translate('notify.dailyBody'),
          schedule: { at, allowWhileIdle: true },
          extra: { route: 'daily', day: localDateKey(at) },
        })),
      });
    } catch (err) {
      console.warn('Reminder schedule failed', err);
    }
  }

  private async ensurePermission(): Promise<boolean> {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') {
        return true;
      }
      const asked = await LocalNotifications.requestPermissions();
      return asked.display === 'granted';
    } catch {
      return false;
    }
  }
}
