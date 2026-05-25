import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { SpeakButtonComponent } from './speak-button.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [SpeakButtonComponent],
  exports: [SpeakButtonComponent],
})
export class SpeakButtonModule {}
