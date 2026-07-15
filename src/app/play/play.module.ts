import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { SharedModule } from '../shared/shared.module';
import { PlayPageRoutingModule } from './play-routing.module';
import { PlayPage } from './play.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    I18nModule,
    SharedModule,
    PlayPageRoutingModule,
  ],
  declarations: [PlayPage],
})
export class PlayPageModule {}
