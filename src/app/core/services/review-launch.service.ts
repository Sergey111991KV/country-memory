import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import type { Country } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { PlayPoolService } from './play-pool.service';
import { PlaySessionService } from './play-session.service';
import { UserLearningService } from './user-learning.service';

/** Minimum pool so a 4-choice quiz has distractors. */
const MIN_POOL = 8;

/**
 * Starts a focused "work on mistakes" flag quiz for a set of countries.
 * The spaced-repetition picker then asks the missed (box 0, due) ones first.
 */
@Injectable({ providedIn: 'root' })
export class ReviewLaunchService {
  private readonly router = inject(Router);
  private readonly catalog = inject(CountriesCatalogService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly learning = inject(UserLearningService);

  /** Countries missed in the session that just ended. */
  missedThisSession(): string[] {
    return this.learning.getMissedSince(this.playSession.startedAt);
  }

  async practice(isos: readonly string[], extraIsos: readonly string[] = []): Promise<boolean> {
    await this.catalog.ensureLoaded();
    const byIso = (iso: string): Country | undefined => this.catalog.getByIso(iso);
    const pool: Country[] = [];
    const seen = new Set<string>();
    const add = (c: Country | undefined): void => {
      if (c && !seen.has(c.iso2)) {
        seen.add(c.iso2);
        pool.push(c);
      }
    };
    isos.forEach((iso) => add(byIso(iso)));
    extraIsos.forEach((iso) => add(byIso(iso)));
    if (pool.length === 0) {
      return false;
    }
    if (pool.length < MIN_POOL) {
      const fill = await this.playPool.getFilteredFreePool();
      for (const c of [...fill].sort(() => Math.random() - 0.5)) {
        if (pool.length >= MIN_POOL) {
          break;
        }
        add(c);
      }
    }
    this.playSession.clear();
    this.playSession.setPool(pool);
    this.playSession.setMeta({ kind: 'default' });
    await this.router.navigate(['/tabs/play/challenge', 'flag_pick_country']);
    return true;
  }
}
