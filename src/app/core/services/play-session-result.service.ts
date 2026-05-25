import { Injectable } from '@angular/core';

import type { PlaySessionResultPayload } from '../data/play-session-result.types';
import { playDebug } from '../utils/play-debug';

@Injectable({ providedIn: 'root' })
export class PlaySessionResultService {
  private pending: PlaySessionResultPayload | null = null;

  set(payload: PlaySessionResultPayload): void {
    this.pending = payload;
    playDebug('SessionResult', 'set', payload);
  }

  consume(): PlaySessionResultPayload | null {
    const value = this.pending;
    this.pending = null;
    playDebug('SessionResult', 'consume', { has: !!value });
    return value;
  }

  peek(): PlaySessionResultPayload | null {
    return this.pending;
  }

  clear(): void {
    this.pending = null;
  }
}
