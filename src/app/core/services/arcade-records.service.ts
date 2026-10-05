import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';

const KEY = 'flagfield_arcade_records_v1';

/** Best scores for timed / streak arcade modes (blitz, silhouette …). */
@Injectable({ providedIn: 'root' })
export class ArcadeRecordsService {
  private readonly storage = inject(StorageService);

  async best(modeId: string): Promise<number> {
    const all = (await this.storage.get<Record<string, number>>(KEY)) ?? {};
    return all[modeId] ?? 0;
  }

  /** Saves `score` if it beats the record; returns true for a new record. */
  async submit(modeId: string, score: number): Promise<boolean> {
    const all = (await this.storage.get<Record<string, number>>(KEY)) ?? {};
    if (score <= (all[modeId] ?? 0)) {
      return false;
    }
    all[modeId] = score;
    await this.storage.set(KEY, all);
    return true;
  }
}
