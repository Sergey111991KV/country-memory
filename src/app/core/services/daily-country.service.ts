import { Injectable, inject, signal } from '@angular/core';

import { dailyPuzzleNumber, localDateKey, previousDateKey } from '../utils/daily-seed';
import { StorageService } from './storage.service';

const STATE_KEY = 'flagfield_daily_country_v1';
const STREAK_KEY = 'flagfield_daily_streak_v1';

export type DailyStatus = 'playing' | 'solved' | 'gave_up';

export interface DailyGuess {
  iso2: string;
  km: number;
}

export interface DailyCountryState {
  date: string;
  iso2: string;
  guesses: DailyGuess[];
  status: DailyStatus;
}

export interface DailyStreak {
  current: number;
  best: number;
  lastSolvedDate: string | null;
  played: number;
  solved: number;
}

const EMPTY_STREAK: DailyStreak = {
  current: 0,
  best: 0,
  lastSolvedDate: null,
  played: 0,
  solved: 0,
};

/** Daily country (shared puzzle) progress + day streak, stored on device. */
@Injectable({ providedIn: 'root' })
export class DailyCountryService {
  private readonly storage = inject(StorageService);

  /** Today's status for the Play hub banner. */
  readonly todayStatus = signal<DailyStatus | 'new'>('new');
  readonly streak = signal<DailyStreak>(EMPTY_STREAK);

  todayKey(): string {
    return localDateKey();
  }

  puzzleNumber(dateKey = this.todayKey()): number {
    return dailyPuzzleNumber(dateKey);
  }

  /** Refresh banner signals (call on hub enter). */
  async refresh(): Promise<void> {
    const today = this.todayKey();
    const state = await this.storage.get<DailyCountryState>(STATE_KEY);
    this.todayStatus.set(state?.date === today ? state.status : 'new');
    this.streak.set(this.effectiveStreak(await this.readStreak(), today));
  }

  /** Loads today's state, or starts a fresh one for `iso2`. */
  async loadToday(iso2: string): Promise<DailyCountryState> {
    const today = this.todayKey();
    const raw = await this.storage.get<DailyCountryState>(STATE_KEY);
    if (raw?.date === today && raw.iso2 === iso2) {
      return raw;
    }
    const fresh: DailyCountryState = { date: today, iso2, guesses: [], status: 'playing' };
    await this.storage.set(STATE_KEY, fresh);
    this.todayStatus.set('playing');
    return fresh;
  }

  async saveState(state: DailyCountryState): Promise<void> {
    await this.storage.set(STATE_KEY, state);
    this.todayStatus.set(state.status);
  }

  /** Marks today finished and updates the streak once. */
  async finish(state: DailyCountryState, solved: boolean): Promise<DailyStreak> {
    const prev = await this.readStreak();
    if (prev.lastSolvedDate === state.date || state.status !== 'playing') {
      return this.effectiveStreak(prev, state.date);
    }
    const next: DailyStreak = { ...prev, played: prev.played + 1 };
    if (solved) {
      const continues = prev.lastSolvedDate === previousDateKey(state.date);
      next.current = continues ? prev.current + 1 : 1;
      next.best = Math.max(prev.best, next.current);
      next.lastSolvedDate = state.date;
      next.solved = prev.solved + 1;
    } else {
      next.current = 0;
    }
    state.status = solved ? 'solved' : 'gave_up';
    await this.storage.set(STREAK_KEY, next);
    await this.saveState(state);
    this.streak.set(next);
    return next;
  }

  async reset(): Promise<void> {
    await this.storage.remove(STATE_KEY);
    await this.storage.remove(STREAK_KEY);
    this.todayStatus.set('new');
    this.streak.set(EMPTY_STREAK);
  }

  private async readStreak(): Promise<DailyStreak> {
    return { ...EMPTY_STREAK, ...((await this.storage.get<DailyStreak>(STREAK_KEY)) ?? {}) };
  }

  /** Streak counts only if the last solve was today or yesterday. */
  private effectiveStreak(streak: DailyStreak, today: string): DailyStreak {
    const alive =
      streak.lastSolvedDate === today || streak.lastSolvedDate === previousDateKey(today);
    return alive ? streak : { ...streak, current: 0 };
  }
}
