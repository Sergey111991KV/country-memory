import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SubscriptionService } from '../services/subscription.service';

/** Blocks dev-only screens (icon gallery, etc.) in production user builds. */
export const billingDebugGuard: CanActivateFn = () => {
  const sub = inject(SubscriptionService);
  const router = inject(Router);

  if (sub.canUseBillingDebug()) {
    return true;
  }

  return router.createUrlTree(['/tabs/settings'], {
    queryParams: { panel: 'support' },
  });
};
