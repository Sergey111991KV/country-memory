import { Injectable, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

const GAMES_KEY = 'flagfield_completed_games_v1';

@Injectable({ providedIn: 'root' })
export class SessionAccessService {
  private readonly storage = inject(StorageService);

  readonly completedGamesSig = signal(0);
  private hydrated = false;

  get freeGamesLimit(): number {
    return environment.freeGamesLimit;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const n = await this.storage.get<number>(GAMES_KEY);
    this.completedGamesSig.set(typeof n === 'number' && n >= 0 ? n : 0);
    this.hydrated = true;
  }

  /** Premium: unlimited. Free: up to `freeGamesLimit` completed sessions. */
  canStartGame(isPremium: boolean): boolean {
    if (isPremium) {
      return true;
    }
    return this.completedGamesSig() < this.freeGamesLimit;
  }

  isAtFreeLimit(isPremium: boolean): boolean {
    return !isPremium && this.completedGamesSig() >= this.freeGamesLimit;
  }

  remainingFreeGames(isPremium: boolean): number {
    if (isPremium) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(0, this.freeGamesLimit - this.completedGamesSig());
  }

  async recordCompletedGame(): Promise<void> {
    await this.hydrate();
    const next = this.completedGamesSig() + 1;
    this.completedGamesSig.set(next);
    await this.storage.set(GAMES_KEY, next);
  }

  async reset(): Promise<void> {
    this.completedGamesSig.set(0);
    this.hydrated = false;
    await this.storage.remove(GAMES_KEY);
  }
}
