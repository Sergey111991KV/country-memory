import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { LocalAuthService } from '../services/local-auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(LocalAuthService);
  const router = inject(Router);
  await auth.hydrate();
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(LocalAuthService);
  const router = inject(Router);
  await auth.hydrate();
  if (!auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/tabs/home']);
};
