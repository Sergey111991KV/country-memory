import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';

import { billingDebugGuard } from '../core/guards/billing-debug.guard';
import { IconGalleryPage } from './icon-gallery/icon-gallery.page';
import { ProductInfoPage } from './product-info/product-info.page';
import { SettingsPage } from './settings.page';

const routes: Routes = [
  {
    path: 'icon-gallery',
    component: IconGalleryPage,
    canActivate: [billingDebugGuard],
  },
  {
    path: 'about-product',
    component: ProductInfoPage,
  },
  {
    path: 'how-it-works',
    redirectTo: '/tabs/settings?panel=about',
    pathMatch: 'full',
  },
  {
    path: 'developer',
    redirectTo: '/tabs/settings?panel=support',
    pathMatch: 'full',
  },
  {
    path: 'support',
    redirectTo: '/tabs/settings?panel=support',
    pathMatch: 'full',
  },
  {
    path: '',
    component: SettingsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsPageRoutingModule {}
