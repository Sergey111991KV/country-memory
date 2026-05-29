import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, ViewWillEnter } from '@ionic/angular';

import type { AppLang } from '../core/i18n/messages';
import { MESSAGES } from '../core/i18n/messages';
import { AccountResetService } from '../core/services/account-reset.service';
import { AppLogService } from '../core/services/app-log.service';
import {
  AppSettingsService,
  applyBodyTypographyClass,
  applyColorPaletteClass,
  type BodyTypography,
  type ColorPalette,
  type HeroTypography,
} from '../core/services/app-settings.service';
import { DisplayTextService } from '../core/services/display-text.service';
import { LegalLinksService } from '../core/services/legal-links.service';
import { LocaleService } from '../core/services/locale.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { LocalAuthService } from '../core/services/local-auth.service';
import { ThemeService } from '../core/services/theme.service';
import { environment } from '../../environments/environment';

export interface SettingsSupportBlock {
  id: 'privacy' | 'terms' | 'support' | 'donate' | 'logs';
  icon: string;
  titleKey: string;
  hintKey: string;
  actionKey: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit, ViewWillEnter {
  private readonly appSettings = inject(AppSettingsService);
  private readonly toastCtrl = inject(ToastController);
  protected readonly i18n = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly legal = inject(LegalLinksService);
  private readonly auth = inject(LocalAuthService);
  private readonly accountReset = inject(AccountResetService);
  private readonly appLog = inject(AppLogService);
  private readonly alertCtrl = inject(AlertController);
  readonly sub = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);
  readonly displayText = inject(DisplayTextService);

  readonly billingDebugEnabled = environment.billingDebugEnabled || environment.devMockBilling || !environment.production;
  readonly freeGamesLimit = environment.freeGamesLimit;
  debugPremium = false;
  logsBusy = false;
  readonly appVersion = environment.appVersion;
  readonly supportEmail = environment.supportEmail;

  readonly supportBlocks: SettingsSupportBlock[] = [
    {
      id: 'privacy',
      icon: 'shield-checkmark-outline',
      titleKey: 'aboutDeveloper.blockPrivacyTitle',
      hintKey: 'aboutDeveloper.blockPrivacyHint',
      actionKey: 'aboutDeveloper.openLink',
    },
    {
      id: 'terms',
      icon: 'document-text-outline',
      titleKey: 'aboutDeveloper.blockTermsTitle',
      hintKey: 'aboutDeveloper.blockTermsHint',
      actionKey: 'aboutDeveloper.openLink',
    },
    {
      id: 'support',
      icon: 'mail-outline',
      titleKey: 'aboutDeveloper.blockSupportTitle',
      hintKey: 'aboutDeveloper.blockSupportHint',
      actionKey: 'aboutDeveloper.emailSupport',
    },
    {
      id: 'logs',
      icon: 'download-outline',
      titleKey: 'support.downloadLogsTitle',
      hintKey: 'support.downloadLogsHint',
      actionKey: 'support.downloadLogsAction',
    },
    {
      id: 'donate',
      icon: 'heart-outline',
      titleKey: 'aboutDeveloper.blockDonateTitle',
      hintKey: 'aboutDeveloper.blockDonateHint',
      actionKey: 'aboutDeveloper.openLink',
    },
  ];

  readonly hasPrivacyUrl = this.legal.hasPrivacyUrl();
  readonly hasTermsUrl = this.legal.hasTermsUrl();
  readonly hasSupportEmail = this.legal.hasSupportEmail();
  readonly hasDonateUrl = this.legal.hasDonateUrl();

  accordionValue = 'premium';
  freeGamesLeft = environment.freeGamesLimit;
  isDarkTheme = false;
  localeCode: AppLang = 'en';
  primaryPlayerName = 'Player';
  heroTypography: HeroTypography = 'comfortable';
  bodyTypography: BodyTypography = 'default';
  colorPalette: ColorPalette = 'ocean';
  heroTitleCustom = '';
  heroSubShortCustom = '';
  heroSubLongCustom = '';

  ngOnInit(): void {
    this.applyPanelFromRoute();
    this.localeCode = this.i18n.language;
    this.isDarkTheme = this.theme.currentTheme === 'dark';
    void this.load();
  }

  ionViewWillEnter(): void {
    this.applyPanelFromRoute();
    void this.load();
  }

  isSupportBlockEnabled(block: SettingsSupportBlock): boolean {
    switch (block.id) {
      case 'privacy':
        return this.hasPrivacyUrl;
      case 'terms':
        return this.hasTermsUrl;
      case 'support':
        return this.hasSupportEmail;
      case 'logs':
        return true;
      case 'donate':
        return this.hasDonateUrl;
      default: {
        const _exhaustive: never = block.id;
        return _exhaustive;
      }
    }
  }

  async openSupportBlock(block: SettingsSupportBlock): Promise<void> {
    if (!this.isSupportBlockEnabled(block)) {
      return;
    }
    switch (block.id) {
      case 'privacy':
        await this.legal.openPrivacy();
        break;
      case 'terms':
        await this.legal.openTerms();
        break;
      case 'support':
        this.legal.openSupportEmail();
        break;
      case 'logs':
        await this.downloadAppLogs();
        break;
      case 'donate':
        await this.legal.openDonate();
        break;
    }
  }

  openIconGallery(): void {
    if (!this.billingDebugEnabled) {
      return;
    }
    void this.router.navigate(['/tabs/settings/icon-gallery']);
  }

  onAccordionChange(ev: CustomEvent): void {
    if (ev.target !== ev.currentTarget) {
      return;
    }
    const v = ev.detail.value;
    if (typeof v === 'string') {
      this.accordionValue = v;
    } else if (Array.isArray(v)) {
      this.accordionValue = v[0] ?? 'language';
    }
  }

  async saveAccountName(): Promise<void> {
    const prev = await this.appSettings.load();
    const name = this.primaryPlayerName.trim() || 'Player';
    this.primaryPlayerName = name;
    await this.appSettings.save({ ...prev, primaryPlayerName: name });
  }

  async onHeroTypographyChange(ev: CustomEvent): Promise<void> {
    const v = String(ev.detail.value) as HeroTypography;
    if (v !== 'compact' && v !== 'comfortable' && v !== 'large') {
      return;
    }
    this.heroTypography = v;
    const prev = await this.appSettings.load();
    await this.appSettings.save({ ...prev, heroTypography: v });
    await this.toastSaved();
  }

  async onColorPaletteChange(ev: CustomEvent): Promise<void> {
    const v = String(ev.detail.value) as ColorPalette;
    if (v !== 'ocean' && v !== 'forest' && v !== 'sunset' && v !== 'classic') {
      return;
    }
    this.colorPalette = v;
    const prev = await this.appSettings.load();
    await this.appSettings.save({ ...prev, colorPalette: v });
    applyColorPaletteClass(v);
    await this.toastSaved();
  }

  async onBodyTypographyChange(ev: CustomEvent): Promise<void> {
    const v = String(ev.detail.value) as BodyTypography;
    if (v !== 'default' && v !== 'comfortable' && v !== 'accessible') {
      return;
    }
    this.bodyTypography = v;
    const prev = await this.appSettings.load();
    await this.appSettings.save({ ...prev, bodyTypography: v });
    applyBodyTypographyClass(v);
    await this.toastSaved();
  }

  async resetCustomHeroTexts(): Promise<void> {
    await this.displayText.clearAll();
    this.heroTitleCustom = '';
    this.heroSubShortCustom = '';
    this.heroSubLongCustom = '';
    const t = await this.toastCtrl.create({
      message: this.i18n.translate('settings.customTextsReset'),
      duration: 1400,
    });
    await t.present();
  }

  async saveCustomHeroTexts(): Promise<void> {
    await this.displayText.ensureLoaded();
    await this.displayText.setOverride('home.heroTitle', this.heroTitleCustom);
    await this.displayText.setOverride('home.heroSubShort', this.heroSubShortCustom);
    await this.displayText.setOverride('home.heroSub', this.heroSubLongCustom);
    const t = await this.toastCtrl.create({
      message: this.i18n.translate('settings.customTextsSaved'),
      duration: 1200,
    });
    await t.present();
  }

  async confirmResetAccount(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.i18n.translate('settings.resetAccountTitle'),
      message: this.i18n.translate('settings.resetAccountMessage'),
      buttons: [
        {
          text: this.i18n.translate('common.cancel'),
          role: 'cancel',
        },
        {
          text: this.i18n.translate('settings.resetAccountConfirm'),
          role: 'destructive',
          handler: () => {
            void this.resetAccount();
          },
        },
      ],
    });
    await alert.present();
  }

  async resetAccount(): Promise<void> {
    await this.accountReset.resetAccount();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  async downloadAppLogs(): Promise<void> {
    if (this.logsBusy) {
      return;
    }
    this.logsBusy = true;
    this.cdr.markForCheck();
    const result = await this.appLog.downloadLogFile();
    this.logsBusy = false;
    this.cdr.markForCheck();
    const key =
      result === 'ok' ? 'support.downloadLogsOk' : 'support.downloadLogsFail';
    const t = await this.toastCtrl.create({
      message: this.i18n.translate(key),
      duration: 2200,
    });
    await t.present();
  }

  async onDebugPremiumToggle(ev: CustomEvent): Promise<void> {
    const checked = Boolean(ev.detail.checked);
    await this.sub.setDebugPremium(checked);
    this.debugPremium = checked;
    await this.load();
    const key = checked ? 'paywall.toastDevOn' : 'paywall.toastCancelled';
    const t = await this.toastCtrl.create({
      message: this.i18n.translate(key),
      duration: 1800,
    });
    await t.present();
  }

  openPaywall(): void {
    void this.router.navigate(['/paywall']);
  }

  openManageSubscriptions(): void {
    void this.sub.openManageSubscriptions();
  }

  async restorePurchases(): Promise<void> {
    const result = await this.sub.restore();
    const key =
      result === 'success'
        ? 'paywall.toastRestored'
        : result === 'empty'
          ? 'paywall.toastNoRestore'
          : 'paywall.toastRestoreFail';
    const t = await this.toastCtrl.create({
      message: this.i18n.translate(key),
      duration: 2200,
    });
    await t.present();
    if (result === 'success') {
      await this.load();
    }
  }

  formatPremiumExpiry(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(this.i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  async onLangChange(ev: CustomEvent): Promise<void> {
    const v = String(ev.detail.value) as AppLang;
    if (!(v in MESSAGES)) {
      return;
    }
    await this.i18n.setLanguage(v);
    this.localeCode = v;
  }

  async onThemeToggle(ev: CustomEvent): Promise<void> {
    const checked = Boolean(ev.detail.checked);
    this.isDarkTheme = checked;
    await this.theme.setTheme(checked ? 'dark' : 'light');
  }

  async load(): Promise<void> {
    await this.sub.init();
    await this.sessionAccess.hydrate();
    await this.auth.hydrate();
    this.debugPremium = this.sub.debugPremiumActive();
    this.freeGamesLeft = this.sessionAccess.remainingFreeGames(this.sub.isSubscribed());

    await this.displayText.ensureLoaded();
    this.heroTitleCustom = this.displayText.getOverride('home.heroTitle');
    this.heroSubShortCustom = this.displayText.getOverride('home.heroSubShort');
    this.heroSubLongCustom = this.displayText.getOverride('home.heroSub');

    const settings = await this.appSettings.load();
    this.primaryPlayerName = settings.primaryPlayerName;
    this.heroTypography = settings.heroTypography;
    this.bodyTypography = settings.bodyTypography;
    this.colorPalette = settings.colorPalette;
    applyBodyTypographyClass(settings.bodyTypography);
    applyColorPaletteClass(settings.colorPalette);
    this.cdr.markForCheck();
  }

  private applyPanelFromRoute(): void {
    const panel = this.route.snapshot.queryParamMap.get('panel');
    if (panel === 'support') {
      this.accordionValue = 'support';
    } else if (panel === 'how-it-works' || panel === 'tour') {
      this.accordionValue = 'how-it-works';
    } else if (panel === 'about') {
      this.accordionValue = 'about';
    }
  }

  private async toastSaved(): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.i18n.translate('settings.saved'),
      duration: 1000,
    });
    await t.present();
  }
}
