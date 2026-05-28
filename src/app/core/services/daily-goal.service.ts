import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';
import { UserLearningService } from './user-learning.service';

const KEY = 'flagfield_daily_goal_v1';

export interface DailyGoalState {
  date: string;
  target: number;
  progress: number;
}

@Injectable({ providedIn: 'root' })
export class DailyGoalService {
  private readonly storage = inject(StorageService);
  private readonly learning = inject(UserLearningService);

  readonly defaultTarget = 5;

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async getState(): Promise<DailyGoalState> {
    await this.learning.hydrate();
    const today = this.todayKey();
    const raw = await this.storage.get<DailyGoalState>(KEY);
    if (raw?.date === today) {
      return raw;
    }
    const progress = this.learning.countCorrectToday();
    const state: DailyGoalState = {
      date: today,
      target: this.defaultTarget,
      progress: Math.min(progress, this.defaultTarget),
    };
    await this.writeStateIfChanged(state);
    return state;
  }

  async bumpProgress(): Promise<DailyGoalState> {
    const state = await this.getState();
    const next: DailyGoalState = {
      ...state,
      progress: Math.min(state.target, state.progress + 1),
    };
    await this.writeStateIfChanged(next);
    return next;
  }

  async syncFromLearning(): Promise<DailyGoalState> {
    await this.learning.hydrate();
    const today = this.todayKey();
    const correct = this.learning.countCorrectToday();
    const state: DailyGoalState = {
      date: today,
      target: this.defaultTarget,
      progress: Math.min(this.defaultTarget, correct),
    };
    await this.writeStateIfChanged(state);
    return state;
  }

  async reset(): Promise<void> {
    await this.storage.remove(KEY);
  }

  private async writeStateIfChanged(state: DailyGoalState): Promise<void> {
    const raw = await this.storage.get<DailyGoalState>(KEY);
    if (
      raw &&
      raw.date === state.date &&
      raw.target === state.target &&
      raw.progress === state.progress
    ) {
      return;
    }
    await this.storage.set(KEY, state);
  }
}
