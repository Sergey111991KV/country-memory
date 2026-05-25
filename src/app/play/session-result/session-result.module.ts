import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { SessionResultPage } from './session-result.page';

const routes: Routes = [{ path: '', component: SessionResultPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [SessionResultPage],
})
export class SessionResultPageModule {}
