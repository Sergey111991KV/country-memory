import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { PassPlayPage } from './pass-play.page';

const routes: Routes = [{ path: '', component: PassPlayPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [PassPlayPage],
})
export class PassPlayPageModule {}
