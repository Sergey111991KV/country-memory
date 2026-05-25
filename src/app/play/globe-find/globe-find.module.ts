import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { GlobeFindPage } from './globe-find.page';

const routes: Routes = [{ path: '', component: GlobeFindPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [GlobeFindPage],
})
export class GlobeFindPageModule {}
