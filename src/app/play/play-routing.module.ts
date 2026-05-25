import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FlagChallengePage } from './flag-challenge/flag-challenge.page';
import { PassPlayPage } from './pass-play/pass-play.page';
import { GlobeFindPage } from './globe-find/globe-find.page';
import { FactsQuizPage } from './facts-quiz/facts-quiz.page';
import { KnowledgeQuizPage } from './knowledge-quiz/knowledge-quiz.page';
import { LearningLevelPage } from './learning-path/learning-level.page';
import { LearningPathPage } from './learning-path/learning-path.page';
import { MapFindPage } from './map-find/map-find.page';
import { MapMarkPage } from './map-mark/map-mark.page';
import { FactsDrillPage } from './facts-drill/facts-drill.page';
import { QuizPage } from './quiz/quiz.page';
import { HomeAboutPage } from '../home/home-about.page';
import { PlayPage } from './play.page';
import { SessionResultPage } from './session-result/session-result.page';

export const PLAY_CHILD_ROUTES: Routes = [
  { path: 'about-game', component: HomeAboutPage },
  { path: 'challenge/:mode', component: FlagChallengePage },
  { path: 'pass-play/:mode', component: PassPlayPage },
  { path: 'knowledge-quiz', component: KnowledgeQuizPage },
  { path: 'facts-quiz', component: FactsQuizPage },
  { path: 'learn', component: LearningPathPage },
  { path: 'learn/:levelId', component: LearningLevelPage },
  { path: 'globe-find', component: GlobeFindPage },
  { path: 'map-find', component: MapFindPage },
  { path: 'map-mark/:filterId', component: MapMarkPage },
  { path: 'facts-drill', component: FactsDrillPage },
  { path: 'session-result', component: SessionResultPage },
  { path: 'quiz', redirectTo: 'challenge/flag_pick_country', pathMatch: 'full' },
  { path: '', component: PlayPage },
];

@NgModule({
  imports: [RouterModule.forChild(PLAY_CHILD_ROUTES)],
  exports: [RouterModule],
})
export class PlayPageRoutingModule {}
