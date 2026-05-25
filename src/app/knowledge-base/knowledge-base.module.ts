import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { SharedModule } from '../shared/shared.module';
import { KnowledgeBasePageRoutingModule } from './knowledge-base-routing.module';
import { KnowledgeBasePage } from './knowledge-base.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    I18nModule,
    SharedModule,
    KnowledgeBasePageRoutingModule,
  ],
  declarations: [KnowledgeBasePage],
})
export class KnowledgeBasePageModule {}
