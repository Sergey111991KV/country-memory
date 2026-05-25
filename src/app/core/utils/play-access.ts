import { Router } from '@angular/router';

import { SessionAccessService } from '../services/session-access.service';
import { SubscriptionService } from '../services/subscription.service';

/** Gate play modes behind subscription / free-game limits before heavy boot. */
export async function ensurePlaySessionAccess(
  subscription: SubscriptionService,
  sessionAccess: SessionAccessService,
  router: Router,
): Promise<boolean> {
  await subscription.init();
  await sessionAccess.hydrate();
  if (sessionAccess.canStartGame(subscription.isSubscribed())) {
    return true;
  }
  void router.navigate(['/paywall']);
  return false;
}
