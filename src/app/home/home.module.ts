import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { SharedModule } from '../shared/shared.module';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';

@NgModule({
  imports: [CommonModule, IonicModule, I18nModule, SharedModule, HomePageRoutingModule],
  declarations: [HomePage],
})
export class HomePageModule {}
