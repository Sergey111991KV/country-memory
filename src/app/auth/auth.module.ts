import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { I18nModule } from '../core/i18n/i18n.module';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginPage } from './login.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, I18nModule, AuthRoutingModule],
  declarations: [LoginPage],
})
export class AuthModule {}
