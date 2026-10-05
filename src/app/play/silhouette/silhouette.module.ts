import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { SilhouettePage } from './silhouette.page';

const routes: Routes = [{ path: '', component: SilhouettePage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [SilhouettePage],
})
export class SilhouettePageModule {}
