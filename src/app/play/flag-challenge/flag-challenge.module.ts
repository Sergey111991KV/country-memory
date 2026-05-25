import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { FlagChallengePage } from './flag-challenge.page';

const routes: Routes = [{ path: '', component: FlagChallengePage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [FlagChallengePage],
})
export class FlagChallengePageModule {}
