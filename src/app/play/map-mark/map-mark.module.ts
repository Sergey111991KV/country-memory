import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { MapMarkPage } from './map-mark.page';

const routes: Routes = [{ path: '', component: MapMarkPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [MapMarkPage],
})
export class MapMarkPageModule {}
