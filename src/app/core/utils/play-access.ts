import { Router } from '@angular/router';

import { SessionAccessService } from '../services/session-access.service';
import { SubscriptionService } from '../services/subscription.service';
import { isBillingEnabled } from './billing-mode';

/** Gate play modes behind subscription / free-game limits when billing is enabled. */
export async function ensurePlaySessionAccess(
  subscription: SubscriptionService,
  sessionAccess: SessionAccessService,
  router: Router,
): Promise<boolean> {
  await sessionAccess.hydrate();
  if (!isBillingEnabled()) {
    return true;
  }
  await subscription.init();
  if (sessionAccess.canStartGame(subscription.isSubscribed())) {
    return true;
  }
  void router.navigate(['/paywall']);
  return false;
}

/** Gate Premium-only modes (globe / map) when billing is enabled. */
export async function ensurePremiumPlayAccess(
  subscription: SubscriptionService,
  router: Router,
): Promise<boolean> {
  if (!isBillingEnabled()) {
    return true;
  }
  await subscription.init();
  if (subscription.isSubscribed()) {
    return true;
  }
  void router.navigate(['/paywall']);
  return false;
}
