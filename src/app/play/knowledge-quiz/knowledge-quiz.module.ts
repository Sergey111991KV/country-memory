import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PLAY_FEATURE_IMPORTS } from '../play-feature-imports';
import { KnowledgeQuizPage } from './knowledge-quiz.page';

const routes: Routes = [{ path: '', component: KnowledgeQuizPage }];

@NgModule({
  imports: [...PLAY_FEATURE_IMPORTS, RouterModule.forChild(routes)],
  declarations: [KnowledgeQuizPage],
})
export class KnowledgeQuizPageModule {}
