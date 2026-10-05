import { TestBed } from '@angular/core/testing';

import { EXPLORE_FILTER_DEFS } from '../core/data/explore-filters';
import type { FreeChallengeMode } from '../core/data/play-tier.constants';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CourseLaunchService } from '../core/services/course-launch.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { resolveLevelLaunchPlan } from './play-level-route';
import {
  buildPlayModesByCategory,
  flattenPlayModes,
} from './play-mode-catalog';
import { resolvePlayModeLaunch } from './play-mode-launch';
import type { PlayModeAction, PlayModeSlide } from './play-mode.types';
import { FIXTURE_COUNTRIES } from './testing/play-test-fixtures';

/** Every FreeChallengeMode the challenge route accepts (including map redirect). */
const ALL_CHALLENGE_MODES: FreeChallengeMode[] = [
  'flag_pick_country',
  'flag_find_map',
  'flag_type_country',
  'capital_pick_country',
  'country_pick_capital',
];

const HUB_RECOGNITION_MODES: FreeChallengeMode[] = [
  'flag_pick_country',
  'flag_type_country',
  'capital_pick_country',
  'country_pick_capital',
];

const PASS_PLAY_MODES: FreeChallengeMode[] = [
  'flag_pick_country',
  'capital_pick_country',
  'country_pick_capital',
];

describe('all play game variants', () => {
  let courseLaunches: CourseLaunchService['launches'];
  let subscribedSlides: PlayModeSlide[];
  let freeSlides: PlayModeSlide[];

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
    subscribedSlides = flattenPlayModes(
      buildPlayModesByCategory(true, courseLaunches),
    );
    freeSlides = flattenPlayModes(
      buildPlayModesByCategory(false, courseLaunches),
    );
  });

  function launchFor(
    action: PlayModeAction,
    isSubscribed: boolean,
  ): ReturnType<typeof resolvePlayModeLaunch> {
    let courseLaunch: (typeof courseLaunches)[number] | undefined;
    if (action.type === 'course_challenge') {
      courseLaunch = courseLaunches.find((l) => l.id === action.launchId);
    }
    return resolvePlayModeLaunch(action, { isSubscribed, courseLaunch });
  }

  describe('hub catalog completeness', () => {
    it('lists every recognition mode', () => {
      for (const mode of HUB_RECOGNITION_MODES) {
        expect(subscribedSlides.some((s) => s.id === mode))
          .withContext(mode)
          .toBeTrue();
      }
    });

    it('lists every recall challenge + quizzes', () => {
      for (const mode of HUB_RECOGNITION_MODES) {
        expect(subscribedSlides.some((s) => s.id === `recall_${mode}`))
          .withContext(`recall_${mode}`)
          .toBeTrue();
      }
      expect(subscribedSlides.some((s) => s.id === 'knowledge_quiz')).toBeTrue();
      expect(subscribedSlides.some((s) => s.id === 'facts_quiz')).toBeTrue();
    });

    it('lists every course launch + learning path', () => {
      expect(subscribedSlides.some((s) => s.id === 'learning_path')).toBeTrue();
      for (const launch of courseLaunches) {
        expect(subscribedSlides.some((s) => s.id === launch.id))
          .withContext(launch.id)
          .toBeTrue();
      }
    });

    it('lists explore globe, map, and every mark filter', () => {
      expect(subscribedSlides.some((s) => s.id === 'globe_find')).toBeTrue();
      expect(subscribedSlides.some((s) => s.id === 'map_find')).toBeTrue();
      for (const def of EXPLORE_FILTER_DEFS) {
        expect(subscribedSlides.some((s) => s.id === `mark_${def.id}`))
          .withContext(def.id)
          .toBeTrue();
      }
    });

    it('lists every pass & play mode', () => {
      expect(subscribedSlides.map((s) => s.id)).toEqual(
        jasmine.arrayContaining([
          'pass_play_flags',
          'pass_play_capitals',
          'pass_play_mixed',
        ]),
      );
    });

    it('keeps free-tier explore entries (locked labels) without dropping modes', () => {
      expect(freeSlides.length).toBe(subscribedSlides.length);
      expect(freeSlides.some((s) => s.id === 'globe_find_locked')).toBeTrue();
      expect(freeSlides.some((s) => s.id === 'map_find_locked')).toBeTrue();
      for (const def of EXPLORE_FILTER_DEFS) {
        expect(freeSlides.some((s) => s.id === `mark_${def.id}`))
          .withContext(def.id)
          .toBeTrue();
      }
    });
  });

  describe('subscribed launch routes (exact commands)', () => {
    const expectedById: Record<string, (string | Record<string, string>)[]> = {
      flag_pick_country: ['/tabs/play/challenge', 'flag_pick_country'],
      flag_type_country: ['/tabs/play/challenge', 'flag_type_country'],
      capital_pick_country: ['/tabs/play/challenge', 'capital_pick_country'],
      country_pick_capital: ['/tabs/play/challenge', 'country_pick_capital'],
      recall_flag_pick_country: ['/tabs/play/challenge', 'flag_pick_country'],
      recall_flag_type_country: ['/tabs/play/challenge', 'flag_type_country'],
      recall_capital_pick_country: ['/tabs/play/challenge', 'capital_pick_country'],
      recall_country_pick_capital: ['/tabs/play/challenge', 'country_pick_capital'],
      knowledge_quiz: ['/tabs/play/knowledge-quiz'],
      facts_quiz: ['/tabs/play/facts-quiz'],
      learning_path: ['/tabs/play/learn'],
      globe_find: ['/tabs/play/globe-find'],
      globe_identify: ['/tabs/play/globe-find', { variant: 'identify' }],
      map_find: ['/tabs/play/map-find'],
      explore_atlas: ['/tabs/play/explore-atlas'],
      pass_play_flags: ['/tabs/play/pass-play', 'flag_pick_country'],
      pass_play_capitals: ['/tabs/play/pass-play', 'capital_pick_country'],
      pass_play_mixed: ['/tabs/play/pass-play', 'country_pick_capital'],
    };

    it('routes every fixed hub mode to the expected screen', () => {
      for (const [id, commands] of Object.entries(expectedById)) {
        const slide = subscribedSlides.find((s) => s.id === id);
        expect(slide).withContext(id).toBeTruthy();
        const launch = launchFor(slide!.action, true);
        expect(launch.kind).withContext(id).toBe('route');
        if (launch.kind === 'route') {
          expect(launch.commands).withContext(id).toEqual(commands);
        }
      }
    });

    it('routes every course challenge to its challengeMode', () => {
      for (const def of courseLaunches) {
        const slide = subscribedSlides.find((s) => s.id === def.id);
        expect(slide).withContext(def.id).toBeTruthy();
        const launch = launchFor(slide!.action, true);
        expect(launch.kind).withContext(def.id).toBe('route');
        if (launch.kind === 'route') {
          expect(launch.commands).withContext(def.id).toEqual([
            '/tabs/play/challenge',
            def.challengeMode!,
          ]);
          expect(launch.setsPool).toBeTrue();
        }
      }
    });

    it('routes every explore mark filter', () => {
      for (const def of EXPLORE_FILTER_DEFS) {
        const id = `mark_${def.id}`;
        const slide = subscribedSlides.find((s) => s.id === id);
        expect(slide).withContext(id).toBeTruthy();
        const launch = launchFor(slide!.action, true);
        expect(launch.kind).withContext(id).toBe('route');
        if (launch.kind === 'route') {
          expect(launch.commands).withContext(id).toEqual([
            '/tabs/play/map-mark',
            def.id,
          ]);
          expect(launch.premiumOnly).toBeTrue();
        }
      }
    });

    it('covers every subscribed hub slide exactly once in the matrix', () => {
      const covered = new Set([
        ...Object.keys(expectedById),
        ...courseLaunches.map((l) => l.id),
        ...EXPLORE_FILTER_DEFS.map((d) => `mark_${d.id}`),
      ]);
      const uncovered = subscribedSlides
        .map((s) => s.id)
        .filter((id) => !covered.has(id));
      expect(uncovered).withContext(uncovered.join(', ')).toEqual([]);
      expect(subscribedSlides.length).toBe(covered.size);
    });
  });

  describe('free-tier explore gates (billing/subscription off)', () => {
    it('sends every explore action to paywall when not subscribed', () => {
      const exploreActions: PlayModeAction[] = [
        { type: 'globe' },
        { type: 'map' },
        ...EXPLORE_FILTER_DEFS.map(
          (def): PlayModeAction => ({
            type: 'explore_mark',
            filterId: def.id,
          }),
        ),
      ];
      for (const action of exploreActions) {
        const launch = launchFor(action, false);
        expect(launch.kind)
          .withContext(JSON.stringify(action))
          .toBe('paywall');
      }
    });

    it('keeps world atlas free without subscription', () => {
      const launch = launchFor({ type: 'explore_atlas' }, false);
      expect(launch).toEqual({
        kind: 'route',
        commands: ['/tabs/play/explore-atlas'],
        setsPool: false,
        premiumOnly: false,
      });
    });

    it('keeps non-explore modes playable without subscription', () => {
      for (const slide of freeSlides) {
        if (
          slide.action.type === 'globe' ||
          slide.action.type === 'map' ||
          slide.action.type === 'explore_mark'
        ) {
          continue;
        }
        const launch = launchFor(slide.action, false);
        expect(launch.kind)
          .withContext(slide.id)
          .toBe('route');
      }
    });
  });

  describe('challenge / pass-play mode surface', () => {
    it('documents every FreeChallengeMode variant', () => {
      expect(ALL_CHALLENGE_MODES).toEqual([
        'flag_pick_country',
        'flag_find_map',
        'flag_type_country',
        'capital_pick_country',
        'country_pick_capital',
      ]);
    });

    it('hub recognition omits flag_find_map (redirects to map-find)', () => {
      expect(HUB_RECOGNITION_MODES).not.toContain('flag_find_map');
      const launch = resolvePlayModeLaunch(
        { type: 'free', mode: 'flag_find_map' },
        { isSubscribed: true },
      );
      expect(launch).toEqual({
        kind: 'route',
        commands: ['/tabs/play/challenge', 'flag_find_map'],
        setsPool: true,
        premiumOnly: false,
      });
    });

    for (const mode of PASS_PLAY_MODES) {
      it(`pass & play accepts mode ${mode}`, () => {
        const launch = resolvePlayModeLaunch(
          { type: 'pass_play', mode },
          { isSubscribed: true },
        );
        expect(launch.kind).toBe('route');
        if (launch.kind === 'route') {
          expect(launch.commands).toEqual(['/tabs/play/pass-play', mode]);
        }
      });
    }
  });

  describe('learning-path topic → game variants', () => {
    const base = {
      order: 1,
      title: { en: 'T' },
      subtitle: { en: 'S' },
      countryIsos: ['FR'],
    };

    it('covers flags-only → flag challenge', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'flags-only',
        topics: ['flags'],
      });
      expect(plan.commands).toEqual(['/tabs/play/challenge', 'flag_pick_country']);
      expect(plan.meta.kind).toBe('default');
    });

    it('covers capitals-only → capital challenge', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'caps',
        topics: ['capitals'],
      });
      expect(plan.commands).toEqual([
        '/tabs/play/challenge',
        'capital_pick_country',
      ]);
    });

    it('covers facts-only → facts-drill', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'facts',
        topics: ['facts'],
      });
      expect(plan.commands).toEqual(['/tabs/play/facts-drill']);
      expect(plan.meta.kind).toBe('facts_drill');
    });

    it('covers flags+capitals → mixed challenge', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'mixed',
        topics: ['flags', 'capitals'],
      });
      expect(plan.meta.kind).toBe('continent_mixed');
    });

    it('covers flags+facts → facts mixed drill', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'ff',
        topics: ['flags', 'facts'],
      });
      expect(plan.commands).toEqual(['/tabs/play/facts-drill']);
      expect(plan.meta.kind).toBe('facts_mixed');
      expect(plan.meta.mixFlags).toBeTrue();
    });

    it('covers capitals+facts → facts mixed drill', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'cf',
        topics: ['capitals', 'facts'],
      });
      expect(plan.meta.kind).toBe('facts_mixed');
    });

    it('covers flags+capitals+facts → facts mixed drill', () => {
      const plan = resolveLevelLaunchPlan({
        ...base,
        id: 'all',
        topics: ['flags', 'capitals', 'facts'],
      });
      expect(plan.meta.kind).toBe('facts_mixed');
    });
  });
});
