import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play/play-feature-imports';
import { HomeAboutPage } from './home-about.page';

const routes: Routes = [{ path: '', component: HomeAboutPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [HomeAboutPage],
})
export class HomeAboutPageModule {}
