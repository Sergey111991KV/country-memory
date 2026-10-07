import { Injectable, inject } from '@angular/core';

import type { GameModeId, LearningEvent, CountryMastery } from '../data/country.types';
import { StorageService } from './storage.service';
import { PerfLogService } from './perf-log.service';
import { dueAtFor, nextBox, smartPick } from '../utils/spaced-repetition';

const EVENTS_KEY = 'flagfield_learning_events_v1';
const MASTERY_KEY = 'flagfield_mastery_v1';
const PERSIST_DEBOUNCE_MS = 400;

@Injectable({ providedIn: 'root' })
export class UserLearningService {
  private readonly storage = inject(StorageService);
  private readonly perf = inject(PerfLogService);

  private events: LearningEvent[] = [];
  private mastery = new Map<string, CountryMastery>();
  private hydrated = false;
  private correctTodayCache: { date: string; count: number } | null = null;
  private activityStreakCache: number | null = null;
  private bestDayCorrectCache: number | null = null;
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
    this.invalidateDerivedCaches();
  }

  /** Revision string for skipping redundant UI refreshes. */
  getDataRevision(): string {
    const last = this.events.length > 0 ? this.events[this.events.length - 1].at : '';
    return `${this.events.length}:${last}:${this.mastery.size}`;
  }

  async recordAttempt(
    mode: GameModeId,
    countryId: string,
    correct: boolean,
    usedSearch: boolean,
    confusedWith?: string | null,
  ): Promise<void> {
    await this.hydrate();
    const now = new Date();
    const at = now.toISOString();
    const event: LearningEvent = { mode, countryId, correct, at, usedSearch };
    if (!correct && confusedWith && confusedWith !== countryId) {
      event.confusedWith = confusedWith;
    }
    this.events.push(event);
    if (this.events.length > 5000) {
      this.events = this.events.slice(-4000);
    }
    const prev = this.mastery.get(countryId) ?? {
      countryId,
      timesSeen: 0,
      timesCorrect: 0,
      lastAt: null,
    };
    const box = nextBox(prev.box, correct);
    const next: CountryMastery = {
      countryId,
      timesSeen: prev.timesSeen + 1,
      timesCorrect: prev.timesCorrect + (correct ? 1 : 0),
      lastAt: at,
      box,
      dueAt: dueAtFor(box, now),
    };
    this.mastery.set(countryId, next);
    this.invalidateDerivedCaches();
    this.schedulePersist();
  }

  /**
   * Spaced-repetition pick: due / missed / unseen countries first, never one
   * already asked this session (`exclude`) while others remain.
   */
  pickForReview<T extends { iso2: string }>(
    pool: readonly T[],
    exclude?: ReadonlySet<string>,
  ): T | null {
    return smartPick(pool, {
      idOf: (c) => c.iso2,
      mastery: (iso) => this.mastery.get(iso),
      exclude,
    });
  }

  /** Countries answered wrong at least once, worst first (for "weak spots"). */
  getWeakSpots(limit = 10): { iso2: string; wrong: number; seen: number; confusedWith: string[] }[] {
    const wrong = new Map<string, number>();
    const confused = new Map<string, Map<string, number>>();
    for (const e of this.events) {
      if (e.correct) {
        continue;
      }
      wrong.set(e.countryId, (wrong.get(e.countryId) ?? 0) + 1);
      if (e.confusedWith) {
        const m = confused.get(e.countryId) ?? new Map<string, number>();
        m.set(e.confusedWith, (m.get(e.confusedWith) ?? 0) + 1);
        confused.set(e.countryId, m);
      }
    }
    return [...wrong.entries()]
      .map(([iso2, n]) => {
        const mastery = this.mastery.get(iso2);
        // Recently mastered countries (box >= 3) drop off the list.
        const resolved = (mastery?.box ?? 0) >= 3;
        return {
          iso2,
          wrong: n,
          seen: mastery?.timesSeen ?? n,
          resolved,
          confusedWith: [...(confused.get(iso2)?.entries() ?? [])]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([c]) => c),
        };
      })
      .filter((w) => !w.resolved)
      .sort((a, b) => b.wrong / b.seen - a.wrong / a.seen || b.wrong - a.wrong)
      .slice(0, limit)
      .map(({ iso2, wrong: w, seen, confusedWith }) => ({ iso2, wrong: w, seen, confusedWith }));
  }

  /** Countries answered wrong in events since `sinceIso` (session review). */
  getMissedSince(sinceIso: string): string[] {
    const out = new Set<string>();
    for (const e of this.events) {
      if (!e.correct && e.at >= sinceIso) {
        out.add(e.countryId);
      }
    }
    return [...out];
  }

  /** All correct answers ever recorded (events are capped, mastery is not). */
  getCorrectTotal(): number {
    let n = 0;
    for (const m of this.mastery.values()) {
      n += m.timesCorrect;
    }
    return n;
  }

  /** Calendar days (YYYY-MM-DD) with at least one correct answer. */
  getActiveDayKeys(): string[] {
    const days = new Set<string>();
    for (const e of this.events) {
      if (e.correct) {
        days.add(e.at.slice(0, 10));
      }
    }
    return [...days];
  }

  /** ISO2 of countries at or above `minBox` in the Leitner system. */
  getLearnedIsos(minBox: number): string[] {
    return [...this.mastery.values()]
      .filter((m) => (m.box ?? 0) >= minBox)
      .map((m) => m.countryId);
  }

  /** Countries once answered wrong that are now learned (box >= minBox). */
  getFixedWeakCount(minBox: number): number {
    const everWrong = new Set(this.events.filter((e) => !e.correct).map((e) => e.countryId));
    let n = 0;
    for (const iso of everWrong) {
      if ((this.mastery.get(iso)?.box ?? 0) >= minBox) {
        n++;
      }
    }
    return n;
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
    if (this.activityStreakCache !== null) {
      return this.activityStreakCache;
    }
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
    this.activityStreakCache = streak;
    return streak;
  }

  /** Best number of correct answers in a single calendar day. */
  getBestDayCorrect(): number {
    if (this.bestDayCorrectCache !== null) {
      return this.bestDayCorrectCache;
    }
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
    this.bestDayCorrectCache = best;
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
    this.invalidateDerivedCaches();
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
      const span = this.perf.span('Learning', 'persist');
      await this.storage.set(EVENTS_KEY, this.events);
      await this.storage.set(MASTERY_KEY, [...this.mastery.values()]);
      span.end({
        events: this.events.length,
        mastery: this.mastery.size,
      });
    })();
    try {
      await this.persistInFlight;
    } finally {
      this.persistInFlight = null;
    }
  }

  private invalidateDerivedCaches(): void {
    this.correctTodayCache = null;
    this.activityStreakCache = null;
    this.bestDayCorrectCache = null;
  }
}
