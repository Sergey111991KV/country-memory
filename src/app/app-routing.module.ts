import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./tabs/tabs.module').then((m) => m.TabsPageModule),
  },
  { path: 'home', redirectTo: 'tabs/play', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'tabs/settings', pathMatch: 'full' },
  {
    path: 'donate',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./paywall/paywall.module').then((m) => m.PaywallPageModule),
  },
  { path: 'paywall', redirectTo: 'donate', pathMatch: 'full' },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
