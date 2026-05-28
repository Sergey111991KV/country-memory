import { Injectable, inject } from '@angular/core';

import type { GameModeId, LearningEvent, CountryMastery } from '../data/country.types';
import { StorageService } from './storage.service';

const EVENTS_KEY = 'flagfield_learning_events_v1';
const MASTERY_KEY = 'flagfield_mastery_v1';
const PERSIST_DEBOUNCE_MS = 400;

@Injectable({ providedIn: 'root' })
export class UserLearningService {
  private readonly storage = inject(StorageService);

  private events: LearningEvent[] = [];
  private mastery = new Map<string, CountryMastery>();
  private hydrated = false;
  private correctTodayCache: { date: string; count: number } | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistInFlight: Promise<void> | null = null;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const ev = await this.storage.get<LearningEvent[]>(EVENTS_KEY);
    this.events = Array.isArray(ev) ? ev : [];
    const raw = await this.storage.get<CountryMastery[]>(MASTERY_KEY);
    this.mastery.clear();
    if (Array.isArray(raw)) {
      for (const m of raw) {
        if (m?.countryId) {
          this.mastery.set(m.countryId, m);
        }
      }
    }
    this.hydrated = true;
    this.correctTodayCache = null;
  }

  async recordAttempt(
    mode: GameModeId,
    countryId: string,
    correct: boolean,
    usedSearch: boolean,
  ): Promise<void> {
    await this.hydrate();
    const at = new Date().toISOString();
    this.events.push({ mode, countryId, correct, at, usedSearch });
    if (this.events.length > 5000) {
      this.events = this.events.slice(-4000);
    }
    const prev = this.mastery.get(countryId) ?? {
      countryId,
      timesSeen: 0,
      timesCorrect: 0,
      lastAt: null,
    };
    const next: CountryMastery = {
      countryId,
      timesSeen: prev.timesSeen + 1,
      timesCorrect: prev.timesCorrect + (correct ? 1 : 0),
      lastAt: at,
    };
    this.mastery.set(countryId, next);
    this.invalidateCorrectTodayCache();
    this.schedulePersist();
  }

  getMastery(countryId: string): CountryMastery | undefined {
    return this.mastery.get(countryId);
  }

  getMasteryList(): CountryMastery[] {
    return [...this.mastery.values()].sort(
      (a, b) => b.timesSeen - a.timesSeen,
    );
  }

  getRecentEvents(limit = 20): LearningEvent[] {
    return this.events.slice(-limit).reverse();
  }

  countCorrectToday(): number {
    const today = new Date().toISOString().slice(0, 10);
    if (this.correctTodayCache?.date === today) {
      return this.correctTodayCache.count;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const t0 = start.getTime();
    const count = this.events.filter((e) => {
      if (!e.correct) {
        return false;
      }
      return new Date(e.at).getTime() >= t0;
    }).length;
    this.correctTodayCache = { date: today, count };
    return count;
  }

  /** Consecutive calendar days with at least one correct answer (including today). */
  getActivityStreak(): number {
    const days = new Set<string>();
    for (const e of this.events) {
      if (e.correct) {
        days.add(e.at.slice(0, 10));
      }
    }
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) {
        break;
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /** Best number of correct answers in a single calendar day. */
  getBestDayCorrect(): number {
    const byDay = new Map<string, number>();
    for (const e of this.events) {
      if (!e.correct) {
        continue;
      }
      const d = e.at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    let best = 0;
    for (const n of byDay.values()) {
      if (n > best) {
        best = n;
      }
    }
    return best;
  }

  /** Flush debounced writes (e.g. before app background). */
  async flushPersist(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistInFlight) {
      await this.persistInFlight;
      return;
    }
    await this.writePersist();
  }

  async reset(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistInFlight) {
      await this.persistInFlight;
    }
    this.events = [];
    this.mastery.clear();
    this.hydrated = false;
    this.correctTodayCache = null;
    await this.storage.remove(EVENTS_KEY);
    await this.storage.remove(MASTERY_KEY);
  }

  private schedulePersist(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.writePersist();
    }, PERSIST_DEBOUNCE_MS);
  }

  private async writePersist(): Promise<void> {
    if (this.persistInFlight) {
      await this.persistInFlight;
    }
    this.persistInFlight = (async () => {
      await this.storage.set(EVENTS_KEY, this.events);
      await this.storage.set(MASTERY_KEY, [...this.mastery.values()]);
    })();
    try {
      await this.persistInFlight;
    } finally {
      this.persistInFlight = null;
    }
  }

  private invalidateCorrectTodayCache(): void {
    this.correctTodayCache = null;
  }
}
