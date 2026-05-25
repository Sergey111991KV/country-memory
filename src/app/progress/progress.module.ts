import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { ProgressPageRoutingModule } from './progress-routing.module';
import { ProgressPage } from './progress.page';

@NgModule({
  imports: [CommonModule, IonicModule, I18nModule, ProgressPageRoutingModule],
  declarations: [ProgressPage],
})
export class ProgressPageModule {}
