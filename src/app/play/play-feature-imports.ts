import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { SharedModule } from '../shared/shared.module';

export const PLAY_FEATURE_IMPORTS = [
  CommonModule,
  FormsModule,
  IonicModule,
  I18nModule,
  SharedModule,
] as const;
