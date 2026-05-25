import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import type { PlaySessionResultPayload } from '../data/play-session-result.types';
import { playDebug } from '../utils/play-debug';
import { PlaySessionResultService } from './play-session-result.service';
import { SessionAccessService } from './session-access.service';
import { SubscriptionService } from './subscription.service';

/** Records a finished play session and routes to the full-screen results page. */
@Injectable({ providedIn: 'root' })
export class PlaySessionCompleteService {
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly subscription = inject(SubscriptionService);
  private readonly router = inject(Router);
  private readonly results = inject(PlaySessionResultService);

  /** @deprecated Use {@link finishWithResult} — kept for gradual migration */
  async presentSessionDoneAlert(doneHeaderKey: string): Promise<void> {
    await this.finishWithResult({
      variant: 'solo',
      titleKey: 'sessionResult.genericTitle',
      doneHeaderKey,
      correct: 0,
      total: 0,
    });
  }

  async finishWithResult(payload: PlaySessionResultPayload): Promise<void> {
    playDebug('SessionComplete', 'finishWithResult', payload);
    await this.sessionAccess.recordCompletedGame();
    await this.subscription.refreshBillingState();
    this.results.set(payload);
    await this.router.navigate(['/tabs/play/session-result'], {
      replaceUrl: true,
    });
  }

  isAtFreeLimit(): boolean {
    return (
      !this.subscription.isSubscribed() && this.sessionAccess.isAtFreeLimit(false)
    );
  }
}
