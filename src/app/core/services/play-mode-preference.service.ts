import { Injectable, inject, signal } from '@angular/core';

import { StorageService } from './storage.service';

const STORAGE_KEY = 'flagfield_preferred_play_mode_v1';
export const DEFAULT_PLAY_MODE_ID = 'flag_pick_country';

@Injectable({ providedIn: 'root' })
export class PlayModePreferenceService {
  private readonly storage = inject(StorageService);

  private hydrated = false;
  private modeId = DEFAULT_PLAY_MODE_ID;

  readonly modeIdSig = signal(DEFAULT_PLAY_MODE_ID);

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    this.hydrated = true;
    const stored = await this.storage.get<string>(STORAGE_KEY);
    this.modeId =
      typeof stored === 'string' && stored.trim()
        ? stored.trim()
        : DEFAULT_PLAY_MODE_ID;
    this.modeIdSig.set(this.modeId);
  }

  getModeId(): string {
    return this.modeId;
  }

  async setModeId(next: string): Promise<void> {
    await this.hydrate();
    const id = typeof next === 'string' && next.trim() ? next.trim() : DEFAULT_PLAY_MODE_ID;
    this.modeId = id;
    this.modeIdSig.set(this.modeId);
    await this.storage.set(STORAGE_KEY, this.modeId);
  }
}
