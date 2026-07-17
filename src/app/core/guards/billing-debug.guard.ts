import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { isBillingEnabled } from '../utils/billing-mode';
import { SubscriptionService } from '../services/subscription.service';

/** Blocks dev-only screens (icon gallery, etc.) in production user builds. */
export const billingDebugGuard: CanActivateFn = () => {
  const router = inject(Router);
  const redirect = router.createUrlTree(['/tabs/settings'], {
    queryParams: { panel: 'support' },
  });

  if (isBillingEnabled()) {
    const sub = inject(SubscriptionService);
    return sub.canUseBillingDebug() ? true : redirect;
  }

  // Donate mode: allow debug screens only outside production.
  return environment.production ? redirect : true;
};
