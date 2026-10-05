import { TestBed } from '@angular/core/testing';

import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CourseLaunchService } from '../core/services/course-launch.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { EXPLORE_FILTER_DEFS } from '../core/data/explore-filters';
import { FIXTURE_COUNTRIES } from './testing/play-test-fixtures';
import {
  buildPlayModesByCategory,
  flattenPlayModes,
} from './play-mode-catalog';
import { resolvePlayModeLaunch } from './play-mode-launch';
import type { PlayModeSlide } from './play-mode.types';

describe('resolvePlayModeLaunch', () => {
  let courseLaunches: CourseLaunchService['launches'];
  let subscribedModes: ReturnType<typeof flattenPlayModes>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CourseLaunchService,
        {
          provide: CountriesCatalogService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getAll: () => FIXTURE_COUNTRIES,
          },
        },
        {
          provide: PlayPoolService,
          useValue: {
            getFreePool: () => Promise.resolve(FIXTURE_COUNTRIES),
            poolForTier: () => Promise.resolve(FIXTURE_COUNTRIES),
          },
        },
      ],
    });
    courseLaunches = TestBed.inject(CourseLaunchService).launches;
    subscribedModes = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    );
  });

  function launchForSlide(slide: PlayModeSlide) {
    let courseLaunch: (typeof courseLaunches)[number] | undefined;
    const action = slide.action;
    if (action.type === 'course_challenge') {
      courseLaunch = courseLaunches.find((l) => l.id === action.launchId);
    }
    return resolvePlayModeLaunch(slide.action, {
      isSubscribed: true,
      courseLaunch,
    });
  }

  it('defines a subscribed route for every hub mode', () => {
    expect(subscribedModes.length).toBe(30);
    for (const slide of subscribedModes) {
      const launch = launchForSlide(slide);
      expect(launch.kind)
        .withContext(slide.id)
        .toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands.length)
          .withContext(slide.id)
          .toBeGreaterThan(0);
      }
    }
  });

  describe('recognition (free challenge)', () => {
    const modes = [
      'flag_pick_country',
      'flag_type_country',
      'capital_pick_country',
      'country_pick_capital',
    ] as const;

    for (const mode of modes) {
      it(`routes ${mode} to challenge`, () => {
        const launch = resolvePlayModeLaunch(
          { type: 'free', mode },
          { isSubscribed: false },
        );
        expect(launch).toEqual({
          kind: 'route',
          commands: ['/tabs/play/challenge', mode],
          setsPool: true,
          premiumOnly: false,
        });
      });
    }
  });

  describe('recall', () => {
    it('routes knowledge quiz', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'knowledge_quiz' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual(['/tabs/play/knowledge-quiz']);
      }
    });

    it('routes facts quiz', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'facts_quiz' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual(['/tabs/play/facts-quiz']);
      }
    });

    it('routes recall challenge with learned pool flag', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'recall_challenge', mode: 'flag_pick_country' },
        { isSubscribed: true },
      );
      expect(launch).toEqual({
        kind: 'route',
        commands: ['/tabs/play/challenge', 'flag_pick_country'],
        setsPool: true,
        premiumOnly: false,
      });
    });
  });

  describe('course', () => {
    it('routes learning path hub', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'learning' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual(['/tabs/play/learn']);
      }
    });

    it('routes continent-africa challenge', () => {
      const def = courseLaunches.find((l) => l.id === 'continent-africa');
      const launch = resolvePlayModeLaunch(
        { type: 'course_challenge', launchId: 'continent-africa' },
        { isSubscribed: true, courseLaunch: def },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual([
          '/tabs/play/challenge',
          'flag_pick_country',
        ]);
        expect(launch.setsPool).toBeTrue();
      }
    });

    it('routes facts_drill from course hub', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'facts_drill', levelId: 'facts-starter' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual(['/tabs/play/facts-drill']);
        expect(launch.setsPool).toBeTrue();
      }
    });
  });

  describe('explore', () => {
    it('routes globe-find when subscribed', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'globe' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual(['/tabs/play/globe-find']);
        expect(launch.premiumOnly).toBeTrue();
      }
    });

    it('sends free users to paywall for globe', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'globe' },
        { isSubscribed: false },
      );
      expect(launch.kind).toBe('paywall');
    });

    it('routes map-find when subscribed', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'map' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual(['/tabs/play/map-find']);
      }
    });

    for (const filter of EXPLORE_FILTER_DEFS) {
      it(`routes map-mark filter ${filter.id}`, () => {
        const launch = resolvePlayModeLaunch(
          { type: 'explore_mark', filterId: filter.id },
          { isSubscribed: true },
        );
        expect(launch.kind).toBe('route');
        if (launch.kind === 'route') {
          expect(launch.commands).toEqual([
            '/tabs/play/map-mark',
            filter.id,
          ]);
        }
      });
    }
  });

  describe('together (pass & play)', () => {
    it('routes flag duel', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'pass_play', mode: 'flag_pick_country' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual([
          '/tabs/play/pass-play',
          'flag_pick_country',
        ]);
      }
    });

    it('routes capital duel', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'pass_play', mode: 'capital_pick_country' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual([
          '/tabs/play/pass-play',
          'capital_pick_country',
        ]);
      }
    });

    it('routes mixed duel', () => {
      const launch = resolvePlayModeLaunch(
        { type: 'pass_play', mode: 'country_pick_capital' },
        { isSubscribed: true },
      );
      expect(launch.kind).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).toEqual([
          '/tabs/play/pass-play',
          'country_pick_capital',
        ]);
      }
    });
  });
});
