import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

import {
  AppSettingsService,
  applyBodyTypographyClass,
  applyColorPaletteClass,
} from './core/services/app-settings.service';
import { DisplayTextService } from './core/services/display-text.service';
import { LocaleService } from './core/services/locale.service';
import { AppLogService } from './core/services/app-log.service';
import { SubscriptionService } from './core/services/subscription.service';
import { ThemeService } from './core/services/theme.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  readonly subscription = inject(SubscriptionService);
  private readonly appLog = inject(AppLogService);
  private readonly locale = inject(LocaleService);
  private resumeListener: PluginListenerHandle | null = null;
  private readonly theme = inject(ThemeService);
  private readonly displayText = inject(DisplayTextService);
  private readonly appSettings = inject(AppSettingsService);

  async ngOnInit(): Promise<void> {
    await this.locale.hydrate();
    await this.displayText.hydrate();
    await this.theme.hydrate();
    const settings = await this.appSettings.load();
    applyBodyTypographyClass(settings.bodyTypography);
    applyColorPaletteClass(settings.colorPalette);
    await this.subscription.init();
    await this.appLog.log('app', 'Application started', {
      version: environment.appVersion,
      production: environment.production,
    });
    await this.registerBillingResumeListener();
  }

  ngOnDestroy(): void {
    void this.resumeListener?.remove();
  }

  showBillingBanner(): boolean {
    return (
      Capacitor.isNativePlatform() &&
      this.subscription.readySig() &&
      !this.subscription.storeConfiguredSig()
    );
  }

  billingBannerText(): string {
    return this.subscription.billingBannerText();
  }

  private async registerBillingResumeListener(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    this.resumeListener = await App.addListener('resume', () => {
      void this.subscription.refreshBillingState();
    });
  }
}
