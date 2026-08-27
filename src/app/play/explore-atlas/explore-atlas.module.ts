import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { ExploreAtlasPage } from './explore-atlas.page';

const routes: Routes = [{ path: '', component: ExploreAtlasPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [ExploreAtlasPage],
})
export class ExploreAtlasPageModule {}
