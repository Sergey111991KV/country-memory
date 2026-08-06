import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonContent, ToastController, ViewDidEnter, ViewWillEnter } from '@ionic/angular';

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
import type { VisualQuality } from '../core/data/visual-quality';
import type { GlobeThemeId } from '../core/data/globe-theme';
import { VisualQualityService } from '../core/services/visual-quality.service';
import { GlobeThemeService } from '../core/services/globe-theme.service';
import { DisplayTextService } from '../core/services/display-text.service';
import { DonatePromptService } from '../core/services/donate-prompt.service';
import { LegalLinksService } from '../core/services/legal-links.service';
import { LocaleService } from '../core/services/locale.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { LocalAuthService } from '../core/services/local-auth.service';
import { ThemeService } from '../core/services/theme.service';
import {
  METRIC_FILTER_TIER_OPTIONS,
  METRICS_REFERENCE_YEAR,
  metricFilterTierKey,
  type CountryMetricFilters,
  type CountryMetricKind,
  type MetricFilterTier,
} from '../core/data/country-metric-filters';
import { CountryMetricFilterService } from '../core/services/country-metric-filter.service';
import { PlayModePreferenceService } from '../core/services/play-mode-preference.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { isBillingEnabled } from '../core/utils/billing-mode';
import {
  listSettingsPlayModes,
  resolveSettingsPlayMode,
} from '../play/play-mode-catalog';
import type { PlayModeSlide } from '../play/play-mode.types';
import { environment } from '../../environments/environment';

export interface SettingsSupportBlock {
  id: 'privacy' | 'terms' | 'support' | 'logs';
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
export class SettingsPage implements OnInit, ViewWillEnter, ViewDidEnter {
  @ViewChild('settingsContent') private settingsContent?: IonContent;

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
  private readonly donatePrompt = inject(DonatePromptService);
  private readonly metricFiltersService = inject(CountryMetricFilterService);
  private readonly playModePreference = inject(PlayModePreferenceService);
  private readonly playPool = inject(PlayPoolService);
  readonly displayText = inject(DisplayTextService);
  private readonly visualQualityService = inject(VisualQualityService);
  private readonly globeThemeService = inject(GlobeThemeService);

  readonly metricsReferenceYear = METRICS_REFERENCE_YEAR;
  readonly metricFilterTiers = METRIC_FILTER_TIER_OPTIONS;

  readonly billingEnabled = isBillingEnabled();
  readonly isProduction = environment.production;
  readonly billingDebugEnabled =
    this.billingEnabled &&
    (environment.billingDebugEnabled || environment.devMockBilling || !environment.production);
  readonly showDevIconGallery = !environment.production;
  readonly hasDonateUrl = this.legal.hasDonateUrl();
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
  ];

  readonly hasPrivacyUrl = this.legal.hasPrivacyUrl();
  readonly hasTermsUrl = this.legal.hasTermsUrl();
  readonly hasSupportEmail = this.legal.hasSupportEmail();

  accordionValue: string | undefined = undefined;
  freeGamesLeft = environment.freeGamesLimit;
  isDarkTheme = false;
  localeCode: AppLang = 'en';
  primaryPlayerName = 'Player';
  heroTypography: HeroTypography = 'comfortable';
  bodyTypography: BodyTypography = 'default';
  colorPalette: ColorPalette = 'ocean';
  visualQuality: VisualQuality = 'balanced';
  globeTheme: GlobeThemeId = 'classic';
  heroTitleCustom = '';
  heroSubShortCustom = '';
  heroSubLongCustom = '';
  metricFilters: CountryMetricFilters = {
    population: 'any',
    area: 'any',
    gdp: 'any',
  };
  metricFiltersActive = false;
  filteredPoolCount = 0;
  tierPoolCount = 0;
  preferredPlayModeId = 'flag_pick_country';
  playModeOptions: PlayModeSlide[] = [];

  ngOnInit(): void {
    this.applyPanelFromRoute();
    this.localeCode = this.i18n.language;
    this.isDarkTheme = this.theme.currentTheme === 'dark';
    void this.load();
  }

  ionViewWillEnter(): void {
    this.applyPanelFromRoute();
    this.cdr.markForCheck();
    void this.load();
  }

  ionViewDidEnter(): void {
    void this.settingsContent?.scrollToTop(0);
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
      default: {
        const _exhaustive: never = block.id;
        return _exhaustive;
      }
    }
  }

  openIconGallery(): void {
    if (!this.billingDebugEnabled && !this.showDevIconGallery) {
      return;
    }
    void this.router.navigate(['/tabs/settings/icon-gallery']);
  }

  onAccordionChange(ev: CustomEvent): void {
    if (ev.target !== ev.currentTarget) {
      return;
    }
    const v = ev.detail.value;
    if (typeof v === 'string' && v.length > 0) {
      this.accordionValue = v;
    } else if (Array.isArray(v) && typeof v[0] === 'string' && v[0].length > 0) {
      this.accordionValue = v[0];
    } else {
      this.accordionValue = undefined;
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

  async onVisualQualityChange(ev: CustomEvent): Promise<void> {
    const v = String(ev.detail.value) as VisualQuality;
    if (v !== 'performance' && v !== 'balanced' && v !== 'quality') {
      return;
    }
    this.visualQuality = v;
    await this.visualQualityService.setLevel(v);
    await this.toastSaved();
  }

  async onGlobeThemeChange(ev: CustomEvent): Promise<void> {
    const v = String(ev.detail.value) as GlobeThemeId;
    if (v !== 'classic' && v !== 'flagfield' && v !== 'minimal') {
      return;
    }
    this.globeTheme = v;
    await this.globeThemeService.setTheme(v);
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

  openDonatePage(): void {
    void this.router.navigate(['/donate']);
  }

  async openDonateLink(): Promise<void> {
    await this.donatePrompt.openDonateLink();
  }

  async onDebugPremiumToggle(ev: CustomEvent): Promise<void> {
    if (!this.billingEnabled) {
      return;
    }
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

  async onPlayModeChange(ev: CustomEvent): Promise<void> {
    const modeId = String(ev.detail.value ?? '');
    const slide = resolveSettingsPlayMode(modeId, this.hasPlayPremium());
    const persistId = slide.id.endsWith('_locked')
      ? slide.id.slice(0, -'_locked'.length)
      : slide.id;
    await this.playModePreference.setModeId(persistId);
    this.preferredPlayModeId = slide.id;
    this.cdr.markForCheck();
    await this.toastSaved();
  }

  async onMetricFilterChange(
    kind: CountryMetricKind,
    ev: CustomEvent,
  ): Promise<void> {
    const tier = String(ev.detail.value) as MetricFilterTier;
    await this.metricFiltersService.setFilters({
      ...this.metricFilters,
      [kind]: tier,
    });
    await this.syncMetricFilters();
    await this.toastSaved();
  }

  private hasPlayPremium(): boolean {
    return !this.billingEnabled || this.sub.isSubscribed();
  }

  private syncPlayModeOptions(): void {
    const premium = this.hasPlayPremium();
    this.playModeOptions = listSettingsPlayModes(premium);
    this.preferredPlayModeId = resolveSettingsPlayMode(
      this.playModePreference.getModeId(),
      premium,
    ).id;
  }

  async resetMetricFilters(): Promise<void> {
    await this.metricFiltersService.resetFilters();
    await this.syncMetricFilters();
    await this.toastSaved();
  }

  metricFilterTierLabel(kind: CountryMetricKind, tier: MetricFilterTier): string {
    return this.i18n.translate(metricFilterTierKey(kind, tier));
  }

  private async syncMetricFilters(): Promise<void> {
    this.metricFilters = this.metricFiltersService.getFilters();
    this.metricFiltersActive = this.metricFiltersService.isActive();
    const base = this.playPool.isPremium()
      ? await this.playPool.getFullPool()
      : await this.playPool.getFreePool();
    this.tierPoolCount = base.length;
    this.filteredPoolCount = this.metricFiltersService.countMatching(base);
    this.cdr.markForCheck();
  }

  async load(): Promise<void> {
    if (this.billingEnabled) {
      await this.sub.init();
      await this.sessionAccess.hydrate();
      this.debugPremium = this.sub.debugPremiumActive();
      this.freeGamesLeft = this.sessionAccess.remainingFreeGames(this.sub.isSubscribed());
    }
    await this.auth.hydrate();
    await this.displayText.ensureLoaded();
    this.heroTitleCustom = this.displayText.getOverride('home.heroTitle');
    this.heroSubShortCustom = this.displayText.getOverride('home.heroSubShort');
    this.heroSubLongCustom = this.displayText.getOverride('home.heroSub');

    const settings = await this.appSettings.load();
    this.primaryPlayerName = settings.primaryPlayerName;
    this.heroTypography = settings.heroTypography;
    this.bodyTypography = settings.bodyTypography;
    this.colorPalette = settings.colorPalette;
    this.visualQuality = settings.visualQuality;
    this.globeTheme = settings.globeTheme;
    await this.visualQualityService.hydrate();
    await this.globeThemeService.hydrate();
    applyBodyTypographyClass(settings.bodyTypography);
    applyColorPaletteClass(settings.colorPalette);
    await this.metricFiltersService.hydrate();
    await this.syncMetricFilters();
    await this.playModePreference.hydrate();
    this.syncPlayModeOptions();
    this.cdr.markForCheck();
  }

  private applyPanelFromRoute(): void {
    const panel = this.route.snapshot.queryParamMap.get('panel');
    if (panel === 'donate') {
      this.accordionValue = 'donate';
    } else if (panel === 'support') {
      this.accordionValue = 'support';
    } else if (panel === 'learning' || panel === 'game') {
      this.accordionValue = 'learning';
    } else if (panel === 'how-it-works' || panel === 'tour' || panel === 'about') {
      this.accordionValue = 'about';
    } else if (panel === 'premium') {
      this.accordionValue = 'premium';
    } else if (panel === 'display') {
      this.accordionValue = 'display';
    } else if (panel === 'language') {
      this.accordionValue = 'language';
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
