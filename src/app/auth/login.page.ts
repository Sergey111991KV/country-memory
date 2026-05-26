import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  AppSettingsService,
} from '../core/services/app-settings.service';
import { AppLogService } from '../core/services/app-log.service';
import { LocalAuthService } from '../core/services/local-auth.service';
import { LocaleService } from '../core/services/locale.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  private readonly auth = inject(LocalAuthService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly appLog = inject(AppLogService);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);

  username = '';
  errorKey = '';
  busy = false;

  async ngOnInit(): Promise<void> {
    await this.auth.hydrate();
    const existing = this.auth.displayName();
    if (existing) {
      this.username = existing;
    }
  }

  async submit(): Promise<void> {
    this.errorKey = '';
    this.busy = true;
    try {
      await this.auth.setDisplayName(this.username);
      const settings = await this.appSettings.load();
      await this.appSettings.save({
        ...settings,
        primaryPlayerName: this.auth.displayName(),
      });
      await this.appLog.log('account', 'Profile name set', {
        name: this.auth.displayName(),
      });
      void this.router.navigate(['/tabs/play']);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'USERNAME_SHORT';
      this.errorKey =
        code === 'USERNAME_SHORT'
          ? 'auth.errorUsernameShort'
          : 'auth.errorInvalid';
    } finally {
      this.busy = false;
    }
  }
}
