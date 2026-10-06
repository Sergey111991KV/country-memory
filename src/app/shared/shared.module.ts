import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { AppIconComponent } from './app-icon/app-icon.component';
import { AriaLabelDirective } from './aria-label/aria-label.directive';
import { CountryCultureModalComponent } from './country-culture-modal/country-culture-modal.component';
import { FlagDisplayComponent } from './flag-display/flag-display.component';
import { SpeakButtonModule } from './speak-button/speak-button.module';

@NgModule({
  imports: [CommonModule, IonicModule, I18nModule, SpeakButtonModule],
  declarations: [
    AppIconComponent,
    AriaLabelDirective,
    FlagDisplayComponent,
    CountryCultureModalComponent,
  ],
  exports: [
    AppIconComponent,
    AriaLabelDirective,
    FlagDisplayComponent,
    CountryCultureModalComponent,
    SpeakButtonModule,
  ],
})
export class SharedModule {}
