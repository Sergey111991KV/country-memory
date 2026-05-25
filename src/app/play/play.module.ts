import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { SharedModule } from '../shared/shared.module';
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
import { PlayPageRoutingModule } from './play-routing.module';
import { PlayPage } from './play.page';
import { SessionResultPage } from './session-result/session-result.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    I18nModule,
    SharedModule,
    PlayPageRoutingModule,
  ],
  declarations: [
    PlayPage,
    HomeAboutPage,
    FlagChallengePage,
    PassPlayPage,
    KnowledgeQuizPage,
    FactsQuizPage,
    LearningPathPage,
    LearningLevelPage,
    GlobeFindPage,
    MapFindPage,
    MapMarkPage,
    FactsDrillPage,
    QuizPage,
    SessionResultPage,
  ],
})
export class PlayPageModule {}
