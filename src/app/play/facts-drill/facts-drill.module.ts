import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { FactsDrillPage } from './facts-drill.page';

const routes: Routes = [{ path: '', component: FactsDrillPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [FactsDrillPage],
})
export class FactsDrillPageModule {}
