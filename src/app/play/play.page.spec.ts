import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';

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
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
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

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    playPool = jasmine.createSpyObj('PlayPoolService', [
      'getFreePool',
      'getLearnedCountries',
      'poolForTier',
    ]);
    playPool.getFreePool.and.returnValue(Promise.resolve(FIXTURE_COUNTRIES));
    playPool.getLearnedCountries.and.returnValue(
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
            remainingFreeGames: () => 10,
            canStartGame: () => true,
          },
        },
        {
          provide: LocaleService,
          useValue: {
            translate: (key: string) => key,
            language: 'en',
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
    component.dockLevel = 'modes';
    component.dockPhase = 'idle';
  });

  it('navigates for every hub mode', async () => {
    const modes = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    );

    expect(modes.length).toBe(35);

    for (const slide of modes) {
      router.navigate.calls.reset();
      playSession.clear();
      await component.launchMode(slide);
      expect(router.navigate)
        .withContext(`mode ${slide.id}`)
        .toHaveBeenCalled();
    }
  });

  it('sets pool and navigates for course facts-starter (facts drill)', async () => {
    const slide = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    ).find((m) => m.id === 'facts-starter');
    expect(slide).toBeDefined();
    expect(slide!.action.type).toBe('facts_drill');
    playSession.clear();
    await component.launchMode(slide!);
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/play/facts-drill']);
  });

  it('sets free pool for recognition flag_pick_country', async () => {
    const slide = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    ).find((m) => m.id === 'flag_pick_country');
    playSession.clear();
    await component.launchMode(slide!);
    expect(playPool.getFreePool).toHaveBeenCalled();
  });

  it('sets learned pool for recall challenge', async () => {
    const slide = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    ).find((m) => m.id === 'recall_flag_pick_country');
    playSession.clear();
    await component.launchMode(slide!);
    expect(playPool.getLearnedCountries).toHaveBeenCalled();
  });
});
