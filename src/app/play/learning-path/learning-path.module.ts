import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { LearningLevelPage } from './learning-level.page';
import { LearningPathPage } from './learning-path.page';

const routes: Routes = [
  { path: '', component: LearningPathPage },
  { path: ':levelId', component: LearningLevelPage },
];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [LearningPathPage, LearningLevelPage],
})
export class LearningPathPageModule {}
