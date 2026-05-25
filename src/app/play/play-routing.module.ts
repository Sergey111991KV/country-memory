import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PlayPage } from './play.page';

export const PLAY_CHILD_ROUTES: Routes = [
  {
    path: 'about-game',
    loadChildren: () =>
      import('../home/home-about.module').then((m) => m.HomeAboutPageModule),
  },
  {
    path: 'challenge/:mode',
    loadChildren: () =>
      import('./flag-challenge/flag-challenge.module').then(
        (m) => m.FlagChallengePageModule,
      ),
  },
  {
    path: 'pass-play/:mode',
    loadChildren: () =>
      import('./pass-play/pass-play.module').then((m) => m.PassPlayPageModule),
  },
  {
    path: 'knowledge-quiz',
    loadChildren: () =>
      import('./knowledge-quiz/knowledge-quiz.module').then(
        (m) => m.KnowledgeQuizPageModule,
      ),
  },
  {
    path: 'facts-quiz',
    loadChildren: () =>
      import('./facts-quiz/facts-quiz.module').then((m) => m.FactsQuizPageModule),
  },
  {
    path: 'learn',
    loadChildren: () =>
      import('./learning-path/learning-path.module').then(
        (m) => m.LearningPathPageModule,
      ),
  },
  {
    path: 'globe-find',
    loadChildren: () =>
      import('./globe-find/globe-find.module').then((m) => m.GlobeFindPageModule),
  },
  {
    path: 'map-find',
    loadChildren: () =>
      import('./map-find/map-find.module').then((m) => m.MapFindPageModule),
  },
  {
    path: 'map-mark/:filterId',
    loadChildren: () =>
      import('./map-mark/map-mark.module').then((m) => m.MapMarkPageModule),
  },
  {
    path: 'facts-drill',
    loadChildren: () =>
      import('./facts-drill/facts-drill.module').then((m) => m.FactsDrillPageModule),
  },
  {
    path: 'session-result',
    loadChildren: () =>
      import('./session-result/session-result.module').then(
        (m) => m.SessionResultPageModule,
      ),
  },
  { path: 'quiz', redirectTo: 'challenge/flag_pick_country', pathMatch: 'full' },
  { path: '', component: PlayPage },
];

@NgModule({
  imports: [RouterModule.forChild(PLAY_CHILD_ROUTES)],
  exports: [RouterModule],
})
export class PlayPageRoutingModule {}
