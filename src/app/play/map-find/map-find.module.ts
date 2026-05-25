import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { MapFindPage } from './map-find.page';

const routes: Routes = [{ path: '', component: MapFindPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [MapFindPage],
})
export class MapFindPageModule {}
