import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { FactsQuizPage } from './facts-quiz.page';

const routes: Routes = [{ path: '', component: FactsQuizPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [FactsQuizPage],
})
export class FactsQuizPageModule {}
