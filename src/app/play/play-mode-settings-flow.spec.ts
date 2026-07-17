import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonicModule,
  ToastController,
} from '@ionic/angular';
import { EMPTY, of } from 'rxjs';

import { I18nModule } from '../core/i18n/i18n.module';
import { AccountResetService } from '../core/services/account-reset.service';
import { AppLogService } from '../core/services/app-log.service';
import { AppSettingsService } from '../core/services/app-settings.service';
import { CountryMetricFilterService } from '../core/services/country-metric-filter.service';
import { DisplayTextService } from '../core/services/display-text.service';
import { DonatePromptService } from '../core/services/donate-prompt.service';
import { GlobeThemeService } from '../core/services/globe-theme.service';
import { LegalLinksService } from '../core/services/legal-links.service';
import { LocalAuthService } from '../core/services/local-auth.service';
import { LocaleService } from '../core/services/locale.service';
import {
  DEFAULT_PLAY_MODE_ID,
  PlayModePreferenceService,
} from '../core/services/play-mode-preference.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { ThemeService } from '../core/services/theme.service';
import { VisualQualityService } from '../core/services/visual-quality.service';
import { StorageService } from '../core/services/storage.service';
import { SettingsPage } from '../settings/settings.page';
import { PlayPage } from './play.page';
import { FIXTURE_COUNTRIES } from './testing/play-test-fixtures';
import { CourseLaunchService } from '../core/services/course-launch.service';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { LearningPathService } from '../core/services/learning-path.service';
import { PlaySessionService } from '../core/services/play-session.service';
import { HomeFeedService } from '../core/services/home-feed.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { PerfLogService } from '../core/services/perf-log.service';

/**
 * UI-flow coverage: Settings → Game settings mode select → Play CTA route.
 * (No Playwright e2e suite in this repo; Jasmine component flow is the harness.)
 */
describe('Settings play mode → Play CTA flow', () => {
  let settings: SettingsPage;
  let settingsFixture: ComponentFixture<SettingsPage>;
  let play: PlayPage;
  let playFixture: ComponentFixture<PlayPage>;
  let router: jasmine.SpyObj<Router>;
  let preference: PlayModePreferenceService;
  let storageMap: Record<string, unknown>;

  beforeEach(async () => {
    storageMap = {};
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    Object.defineProperty(router, 'events', { value: EMPTY });
    Object.defineProperty(router, 'url', { value: '/tabs/play' });

    const storage: Pick<StorageService, 'get' | 'set'> = {
      get: <T>(key: string) =>
        Promise.resolve((storageMap[key] as T | undefined) ?? null),
      set: (key: string, value: unknown) => {
        storageMap[key] = value;
        return Promise.resolve();
      },
    };

    await TestBed.configureTestingModule({
      declarations: [SettingsPage, PlayPage],
      imports: [IonicModule.forRoot(), I18nModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } }, queryParamMap: of({}) } },
        { provide: StorageService, useValue: storage },
        PlayModePreferenceService,
        PlaySessionService,
        CourseLaunchService,
        {
          provide: PlayPoolService,
          useValue: {
            getFreePool: () => Promise.resolve(FIXTURE_COUNTRIES),
            getFullPool: () => Promise.resolve(FIXTURE_COUNTRIES),
            getFilteredFreePool: () => Promise.resolve(FIXTURE_COUNTRIES),
            getLearnedCountries: () => Promise.resolve(FIXTURE_COUNTRIES),
            getFilteredLearnedCountries: () => Promise.resolve(FIXTURE_COUNTRIES),
            poolForTier: () => Promise.resolve(FIXTURE_COUNTRIES),
            isPremium: () => true,
          },
        },
        {
          provide: CountryMetricFilterService,
          useValue: {
            hydrate: () => Promise.resolve(),
            getFilters: () => ({ population: 'any', area: 'any', gdp: 'any' }),
            isActive: () => false,
            setFilters: () => Promise.resolve(),
            resetFilters: () => Promise.resolve(),
            countMatching: () => FIXTURE_COUNTRIES.length,
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            init: () => Promise.resolve(),
            isSubscribed: () => true,
            debugPremiumActive: () => false,
            premiumKindSig: () => null,
            premiumExpiresIsoSig: () => null,
            canPurchaseInApp: () => false,
            manageSubscriptionsUrl: () => null,
            storeLabel: () => 'App Store',
          },
        },
        {
          provide: SessionAccessService,
          useValue: {
            hydrate: () => Promise.resolve(),
            canStartGame: () => true,
            remainingFreeGames: () => 10,
          },
        },
        {
          provide: LocaleService,
          useValue: {
            translate: (key: string) => key,
            language: 'en',
            langSig: () => 'en',
            setLanguage: () => Promise.resolve(),
          },
        },
        {
          provide: ThemeService,
          useValue: {
            currentTheme: 'light',
            setTheme: () => Promise.resolve(),
          },
        },
        {
          provide: AppSettingsService,
          useValue: {
            load: () =>
              Promise.resolve({
                primaryPlayerName: 'Player',
                heroTypography: 'comfortable',
                bodyTypography: 'default',
                colorPalette: 'ocean',
                visualQuality: 'balanced',
                globeTheme: 'classic',
              }),
            save: () => Promise.resolve(),
          },
        },
        {
          provide: DisplayTextService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getOverride: () => '',
            defaultFor: (key: string) => key,
            setOverrides: () => Promise.resolve(),
          },
        },
        {
          provide: VisualQualityService,
          useValue: { hydrate: () => Promise.resolve(), setQuality: () => Promise.resolve() },
        },
        {
          provide: GlobeThemeService,
          useValue: { hydrate: () => Promise.resolve(), setTheme: () => Promise.resolve() },
        },
        {
          provide: LegalLinksService,
          useValue: {
            hasDonateUrl: () => false,
            hasPrivacyUrl: () => false,
            hasTermsUrl: () => false,
            hasSupportEmail: () => false,
            openPrivacy: () => Promise.resolve(),
            openTerms: () => Promise.resolve(),
            openDonate: () => Promise.resolve(),
            openSupportEmail: () => Promise.resolve(),
          },
        },
        {
          provide: LocalAuthService,
          useValue: { hydrate: () => Promise.resolve() },
        },
        {
          provide: AccountResetService,
          useValue: { resetAll: () => Promise.resolve() },
        },
        {
          provide: AppLogService,
          useValue: { downloadLogs: () => Promise.resolve() },
        },
        {
          provide: DonatePromptService,
          useValue: { maybeNavigateToDonate: () => Promise.resolve(false) },
        },
        {
          provide: ToastController,
          useValue: {
            create: () =>
              Promise.resolve({ present: () => Promise.resolve() }),
          },
        },
        {
          provide: AlertController,
          useValue: {
            create: () =>
              Promise.resolve({ present: () => Promise.resolve() }),
          },
        },
        {
          provide: HomeFeedService,
          useValue: {
            ensureDeck: () => Promise.resolve(),
            currentCard: () => null,
            advance: () => null,
          },
        },
        {
          provide: CountriesCatalogService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getAll: () => FIXTURE_COUNTRIES,
          },
        },
        {
          provide: LearningPathService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getLevel: () => undefined,
            resolveLevelPool: () => Promise.resolve(FIXTURE_COUNTRIES),
          },
        },
        {
          provide: DailyGoalService,
          useValue: {
            syncFromLearning: () => Promise.resolve({ progress: 0, target: 5 }),
          },
        },
        {
          provide: PerfLogService,
          useValue: {
            span: () => ({ end: () => undefined }),
          },
        },
      ],
    }).compileComponents();

    preference = TestBed.inject(PlayModePreferenceService);
    settingsFixture = TestBed.createComponent(SettingsPage);
    settings = settingsFixture.componentInstance;
    playFixture = TestBed.createComponent(PlayPage);
    play = playFixture.componentInstance;

    await preference.hydrate();
    await settings.load();
  });

  it('defaults to flag_pick_country and Play launches that challenge', async () => {
    expect(settings.preferredPlayModeId).toBe(DEFAULT_PLAY_MODE_ID);
    await play.playQuick();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/challenge',
      'flag_pick_country',
    ]);
  });

  it('changing Game settings play mode changes the Play CTA route', async () => {
    await settings.onPlayModeChange({
      detail: { value: 'capital_pick_country' },
    } as CustomEvent);
    expect(preference.getModeId()).toBe('capital_pick_country');
    expect(settings.preferredPlayModeId).toBe('capital_pick_country');

    router.navigate.calls.reset();
    await play.playQuick();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/challenge',
      'capital_pick_country',
    ]);

    await settings.onPlayModeChange({
      detail: { value: 'globe_find' },
    } as CustomEvent);
    router.navigate.calls.reset();
    await play.playQuick();
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/play/globe-find']);

    await settings.onPlayModeChange({
      detail: { value: 'pass_play_capitals' },
    } as CustomEvent);
    router.navigate.calls.reset();
    await play.playQuick();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/pass-play',
      'capital_pick_country',
    ]);
  });

  it('persists preferred mode so a new Play load still uses it', async () => {
    await settings.onPlayModeChange({
      detail: { value: 'map_find' },
    } as CustomEvent);

    const playAgain = TestBed.createComponent(PlayPage).componentInstance;
    router.navigate.calls.reset();
    await playAgain.playQuick();
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/play/map-find']);
  });
});
