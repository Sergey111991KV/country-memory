import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { IconGalleryPage } from './icon-gallery/icon-gallery.page';
import { ProductInfoPage } from './product-info/product-info.page';
import { SharedModule } from '../shared/shared.module';
import { SettingsPageRoutingModule } from './settings-routing.module';
import { SettingsPage } from './settings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    I18nModule,
    SharedModule,
    SettingsPageRoutingModule,
  ],
  declarations: [SettingsPage, ProductInfoPage, IconGalleryPage],
})
export class SettingsPageModule {}
