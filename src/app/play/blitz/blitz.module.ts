import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { BlitzPage } from './blitz.page';

const routes: Routes = [{ path: '', component: BlitzPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [BlitzPage],
})
export class BlitzPageModule {}
