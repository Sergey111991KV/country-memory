import { Injectable, inject } from '@angular/core';

import type { Country } from '../data/country.types';
import type { FreeChallengeMode } from '../data/play-tier.constants';
import { playDebug } from '../utils/play-debug';
import type {
  PassPlayScoringStyle,
  PassPlaySession,
} from './pass-play-session';
import { PlayPoolService } from './play-pool.service';

export type PlaySessionKind =
  | 'default'
  | 'continent_mixed'
  | 'facts_drill'
  | 'facts_mixed';

export interface PlaySessionMeta {
  kind?: PlaySessionKind;
  levelId?: string | null;
  mixFlags?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlaySessionService {
  private readonly playPool = inject(PlayPoolService);

  private poolOverride: Country[] | null = null;
  challengeMode: FreeChallengeMode | null = null;
  passPlay: PassPlaySession | null = null;
  /** Used when opening pass-play setup before session is created. */
  pendingPassPlayScoring: PassPlayScoringStyle = 'turns';
  sessionKind: PlaySessionKind = 'default';
  levelId: string | null = null;
  /** When true (facts_mixed), ~35% of facts-drill rounds show a flag quiz instead. */
  mixFlags = false;
  /** Solo session score (reset in clear). */
  sessionCorrect = 0;
  sessionAnswered = 0;

  setPool(pool: Country[]): void {
    this.poolOverride = pool;
    playDebug('PlaySession', 'setPool', { count: pool.length });
  }

  setMeta(meta: PlaySessionMeta): void {
    if (meta.kind !== undefined) {
      this.sessionKind = meta.kind;
    }
    if (meta.levelId !== undefined) {
      this.levelId = meta.levelId;
    }
    if (meta.mixFlags !== undefined) {
      this.mixFlags = meta.mixFlags;
    }
    playDebug('PlaySession', 'setMeta', {
      kind: this.sessionKind,
      levelId: this.levelId,
      mixFlags: this.mixFlags,
    });
  }

  recordAnswer(correct: boolean): void {
    this.sessionAnswered += 1;
    if (correct) {
      this.sessionCorrect += 1;
    }
    playDebug('PlaySession', 'recordAnswer', {
      correct,
      sessionCorrect: this.sessionCorrect,
      sessionAnswered: this.sessionAnswered,
    });
  }

  clear(): void {
    playDebug('PlaySession', 'clear');
    this.poolOverride = null;
    this.challengeMode = null;
    this.passPlay = null;
    this.pendingPassPlayScoring = 'turns';
    this.sessionKind = 'default';
    this.levelId = null;
    this.mixFlags = false;
    this.sessionCorrect = 0;
    this.sessionAnswered = 0;
  }

  setPassPlay(session: PassPlaySession): void {
    this.passPlay = session;
    this.challengeMode = session.mode;
    playDebug('PlaySession', 'setPassPlay', { mode: session.mode });
  }

  async resolvePool(): Promise<Country[]> {
    if (this.poolOverride?.length) {
      playDebug('PlaySession', 'resolvePool override', {
        count: this.poolOverride.length,
      });
      return this.poolOverride;
    }
    const tier = await this.playPool.poolForTier();
    playDebug('PlaySession', 'resolvePool tier', { count: tier.length });
    return tier;
  }
}
