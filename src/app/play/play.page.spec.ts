import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { EMPTY } from 'rxjs';

import { I18nModule } from '../core/i18n/i18n.module';
import { AppSettingsService } from '../core/services/app-settings.service';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CourseLaunchService } from '../core/services/course-launch.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { DisplayTextService } from '../core/services/display-text.service';
import { LearningPathService } from '../core/services/learning-path.service';
import { LocaleService } from '../core/services/locale.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { PlaySessionService } from '../core/services/play-session.service';
import { DonatePromptService } from '../core/services/donate-prompt.service';
import { HomeFeedService } from '../core/services/home-feed.service';
import { PlayModePreferenceService } from '../core/services/play-mode-preference.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { UserLearningService } from '../core/services/user-learning.service';
import {
  buildPlayModesByCategory,
  flattenPlayModes,
} from './play-mode-catalog';
import { PlayPage } from './play.page';
import { FIXTURE_COUNTRIES } from './testing/play-test-fixtures';

describe('PlayPage launchMode', () => {
  let component: PlayPage;
  let fixture: ComponentFixture<PlayPage>;
  let router: jasmine.SpyObj<Router>;
  let playSession: PlaySessionService;
  let playPool: jasmine.SpyObj<PlayPoolService>;
  let courseLaunch: CourseLaunchService;
  let courseLaunches: CourseLaunchService['launches'];
  let preferredModeId = 'flag_pick_country';

  beforeEach(async () => {
    preferredModeId = 'flag_pick_country';
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    Object.defineProperty(router, 'events', { value: EMPTY });
    Object.defineProperty(router, 'url', { value: '/tabs/play' });

    playPool = jasmine.createSpyObj('PlayPoolService', [
      'getFreePool',
      'getFilteredFreePool',
      'getLearnedCountries',
      'getFilteredLearnedCountries',
      'poolForTier',
    ]);
    playPool.getFreePool.and.returnValue(Promise.resolve(FIXTURE_COUNTRIES));
    playPool.getFilteredFreePool.and.returnValue(Promise.resolve(FIXTURE_COUNTRIES));
    playPool.getLearnedCountries.and.returnValue(
      Promise.resolve(FIXTURE_COUNTRIES),
    );
    playPool.getFilteredLearnedCountries.and.returnValue(
      Promise.resolve(FIXTURE_COUNTRIES),
    );
    playPool.poolForTier.and.returnValue(Promise.resolve(FIXTURE_COUNTRIES));

    await TestBed.configureTestingModule({
      declarations: [PlayPage],
      imports: [IonicModule.forRoot(), I18nModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: PlayPoolService, useValue: playPool },
        PlaySessionService,
        CourseLaunchService,
        {
          provide: CountriesCatalogService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getAll: () => FIXTURE_COUNTRIES,
            localizedName: (country: (typeof FIXTURE_COUNTRIES)[number]) =>
              country.names.en,
          },
        },
        {
          provide: DonatePromptService,
          useValue: {
            maybeNavigateToDonate: () => Promise.resolve(false),
          },
        },
        {
          provide: PlayModePreferenceService,
          useValue: {
            hydrate: () => Promise.resolve(),
            getModeId: () => preferredModeId,
            setModeId: (id: string) => {
              preferredModeId = id;
              return Promise.resolve();
            },
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            init: () => Promise.resolve(),
            isSubscribed: () => true,
          },
        },
        {
          provide: SessionAccessService,
          useValue: {
            hydrate: () => Promise.resolve(),
            canStartGame: () => true,
          },
        },
        {
          provide: LocaleService,
          useValue: {
            translate: (key: string) => key,
            language: 'en',
            langSig: () => 'en',
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
          provide: AlertController,
          useValue: {
            create: () =>
              Promise.resolve({ present: () => Promise.resolve() }),
          },
        },
        {
          provide: AppSettingsService,
          useValue: {
            load: () => Promise.resolve({ heroTypography: 'comfortable' }),
          },
        },
        {
          provide: DailyGoalService,
          useValue: {
            syncFromLearning: () =>
              Promise.resolve({ progress: 0, target: 5 }),
            bumpProgress: () => Promise.resolve(),
          },
        },
        {
          provide: UserLearningService,
          useValue: {
            recordAttempt: () => Promise.resolve(),
          },
        },
        {
          provide: DisplayTextService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            effective: (key: string) => key,
          },
        },
        {
          provide: LearningPathService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getLevel: (id: string) =>
              id === 'facts-starter'
                ? {
                    id,
                    order: 1,
                    title: { en: 'Facts' },
                    subtitle: { en: 'Sub' },
                    countryIsos: [],
                    topics: ['facts'],
                    useFreeTierPool: true,
                  }
                : undefined,
            resolveLevelPool: () => Promise.resolve(FIXTURE_COUNTRIES),
          },
        },
      ],
    }).compileComponents();

    courseLaunch = TestBed.inject(CourseLaunchService);
    spyOn(courseLaunch, 'resolvePool').and.returnValue(
      Promise.resolve(FIXTURE_COUNTRIES),
    );
    courseLaunches = courseLaunch.launches;

    fixture = TestBed.createComponent(PlayPage);
    component = fixture.componentInstance;
    playSession = TestBed.inject(PlaySessionService);
  });

  it('playQuick follows the preferred mode from settings', async () => {
    preferredModeId = 'capital_pick_country';
    playSession.clear();
    await component.playQuick();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/challenge',
      'capital_pick_country',
    ]);
  });

  it('playQuick changes route when settings preferred mode changes', async () => {
    preferredModeId = 'flag_pick_country';
    await component.playQuick();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/challenge',
      'flag_pick_country',
    ]);

    router.navigate.calls.reset();
    preferredModeId = 'map_find';
    await component.playQuick();
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/play/map-find']);

    router.navigate.calls.reset();
    preferredModeId = 'pass_play_flags';
    await component.playQuick();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/pass-play',
      'flag_pick_country',
    ]);
  });

  it('playFeedCard starts challenge for flag cards', async () => {
    component.feedCard = {
      id: 'ES-flag',
      kind: 'flag',
      iso: 'ES',
      countryName: 'Spain',
      titleKey: 'home.feed.flagTitle',
      body: 'Spain',
      flagUrl: 'flag://ES',
    };
    playSession.clear();
    await component.playFeedCard();
    expect(playPool.getFilteredFreePool).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/challenge',
      'flag_pick_country',
    ]);
    expect(playSession.sessionKind).toBe('default');
  });

  it('playFeedCard routes capital cards to capital challenge', async () => {
    component.feedCard = {
      id: 'ES-capital',
      kind: 'capital',
      iso: 'ES',
      countryName: 'Spain',
      titleKey: 'home.feed.capitalTitle',
      body: 'Madrid',
      flagUrl: 'flag://ES',
    };
    playSession.clear();
    await component.playFeedCard();
    expect(router.navigate).toHaveBeenCalledWith([
      '/tabs/play/challenge',
      'capital_pick_country',
    ]);
  });

  it('answerChoice marks feedback for capital clue', async () => {
    component.feedCard = {
      id: 'ES-capital',
      kind: 'capital',
      iso: 'ES',
      countryName: 'Spain',
      titleKey: 'home.feed.capitalTitle',
      body: 'Madrid',
      flagUrl: 'flag://ES',
    };
    component.feedPhase = 'pick';
    component.choices = [
      { country: FIXTURE_COUNTRIES[0], label: 'Spain' },
      { country: FIXTURE_COUNTRIES[1], label: 'Germany' },
    ];
    await component.answerChoice(component.choices[0]);
    expect(component.feedPhase).toBe('feedback');
    expect(component.feedbackCorrect).toBeTrue();
  });

  it('builds feed choices from catalog when ISO is outside filtered pool', async () => {
    const homeFeed = TestBed.inject(HomeFeedService) as unknown as {
      ensureDeck: () => Promise<void>;
      currentCard: () => unknown;
      advance: () => unknown;
    };
    const card = {
      id: 'ES-flag',
      kind: 'flag' as const,
      iso: 'ES',
      countryName: 'Spain',
      titleKey: 'home.feed.flagTitle',
      body: 'Spain',
      flagUrl: 'flag://ES',
    };
    homeFeed.currentCard = () => card;
    homeFeed.advance = () => card;
    playPool.getFilteredFreePool.and.returnValue(
      Promise.resolve(FIXTURE_COUNTRIES.filter((c) => c.iso2 !== 'ES')),
    );

    await component.refreshFeed();

    expect(component.feedCard?.iso).toBe('ES');
    expect(component.choices.length).toBeGreaterThanOrEqual(2);
    expect(
      component.choices.some((c) => c.country.iso2.toUpperCase() === 'ES'),
    ).toBeTrue();
  });

  it('navigates every hub mode to its resolved route', async () => {
    const modes = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    );

    expect(modes.length).toBe(29);

    for (const slide of modes) {
      router.navigate.calls.reset();
      playSession.clear();
      playPool.getFilteredFreePool.calls.reset();
      playPool.getFilteredLearnedCountries.calls.reset();
      (courseLaunch.resolvePool as jasmine.Spy).calls.reset();

      await component.launchMode(slide);

      expect(router.navigate)
        .withContext(`mode ${slide.id}`)
        .toHaveBeenCalled();
      const commands = router.navigate.calls.mostRecent()?.args[0];
      expect(Array.isArray(commands) && commands.length > 0)
        .withContext(`mode ${slide.id} commands`)
        .toBeTrue();

      if (slide.action.type === 'free') {
        expect(playPool.getFilteredFreePool)
          .withContext(slide.id)
          .toHaveBeenCalled();
      }
      if (slide.action.type === 'recall_challenge') {
        expect(playPool.getFilteredLearnedCountries)
          .withContext(slide.id)
          .toHaveBeenCalled();
      }
      if (slide.action.type === 'course_challenge') {
        expect(courseLaunch.resolvePool)
          .withContext(slide.id)
          .toHaveBeenCalledWith(slide.action.launchId);
      }
    }
  });

  it('sets free pool for every recognition mode', async () => {
    const recognition = buildPlayModesByCategory(true, courseLaunches).recognition;
    for (const slide of recognition) {
      playPool.getFilteredFreePool.calls.reset();
      playSession.clear();
      await component.launchMode(slide);
      expect(playPool.getFilteredFreePool)
        .withContext(slide.id)
        .toHaveBeenCalled();
    }
  });

  it('sets learned pool for every recall challenge mode', async () => {
    const recall = buildPlayModesByCategory(true, courseLaunches).recall.filter(
      (m) => m.action.type === 'recall_challenge',
    );
    expect(recall.length).toBe(4);
    for (const slide of recall) {
      playPool.getFilteredLearnedCountries.calls.reset();
      playSession.clear();
      await component.launchMode(slide);
      expect(playPool.getFilteredLearnedCountries)
        .withContext(slide.id)
        .toHaveBeenCalled();
    }
  });

  it('marks mixed course continents as continent_mixed meta', async () => {
    for (const id of ['continent-asia', 'continent-europe'] as const) {
      const slide = flattenPlayModes(
        buildPlayModesByCategory(true, courseLaunches),
      ).find((m) => m.id === id);
      playSession.clear();
      await component.launchMode(slide!);
      expect(playSession.sessionKind)
        .withContext(id)
        .toBe('continent_mixed');
    }
  });

  it('keeps non-mixed course continents on default meta', async () => {
    const slide = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    ).find((m) => m.id === 'continent-africa');
    playSession.clear();
    await component.launchMode(slide!);
    expect(playSession.sessionKind).toBe('default');
  });

  it('stores pending scoring for every pass & play mode', async () => {
    const together = buildPlayModesByCategory(true, courseLaunches).together;
    expect(together.length).toBe(3);
    for (const slide of together) {
      playSession.clear();
      await component.launchMode(slide);
      expect(playSession.pendingPassPlayScoring)
        .withContext(slide.id)
        .toBe('turns');
      expect(router.navigate)
        .withContext(slide.id)
        .toHaveBeenCalledWith([
          '/tabs/play/pass-play',
          slide.action.type === 'pass_play' ? slide.action.mode : '',
        ]);
    }
  });
});
