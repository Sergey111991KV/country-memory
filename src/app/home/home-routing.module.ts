import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeAboutPage } from './home-about.page';
import { HomePage } from './home.page';

const routes: Routes = [
  {
    path: 'about-game',
    component: HomeAboutPage,
  },
  {
    path: '',
    component: HomePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
