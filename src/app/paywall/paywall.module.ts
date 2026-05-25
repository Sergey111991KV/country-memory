import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { SharedModule } from '../shared/shared.module';
import { PaywallPageRoutingModule } from './paywall-routing.module';
import { PaywallPage } from './paywall.page';

@NgModule({
  imports: [CommonModule, IonicModule, I18nModule, SharedModule, PaywallPageRoutingModule],
  declarations: [PaywallPage],
})
export class PaywallPageModule {}
