import { TestBed } from '@angular/core/testing';

import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CourseLaunchService } from '../core/services/course-launch.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { EXPLORE_FILTER_DEFS } from '../core/data/explore-filters';
import { FIXTURE_COUNTRIES } from './testing/play-test-fixtures';
import {
  buildPlayCategories,
  buildPlayModesByCategory,
  flattenPlayModes,
  listSettingsPlayModes,
  resolveSettingsPlayMode,
} from './play-mode-catalog';

describe('play mode catalog', () => {
  let courseLaunches: CourseLaunchService['launches'];

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
  });

  it('lists expected mode counts when subscribed', () => {
    const modes = buildPlayModesByCategory(true, courseLaunches);
    expect(modes.recognition.length).toBe(4);
    expect(modes.recall.length).toBe(6);
    expect(modes.course.length).toBe(8);
    expect(modes.explore.length).toBe(4 + EXPLORE_FILTER_DEFS.length);
    expect(modes.together.length).toBe(3);
    expect(flattenPlayModes(modes).length).toBe(30);
  });

  it('keeps recall off the wheel but available as side category', () => {
    const modes = buildPlayModesByCategory(true, courseLaunches);
    const { wheel, recall } = buildPlayCategories(modes, true);
    expect(wheel.map((c) => c.id)).toEqual([
      'recognition',
      'course',
      'explore',
      'together',
    ]);
    expect(recall.id).toBe('recall');
    expect(recall.modeCount).toBe(6);
  });

  it('marks explore locked for free tier', () => {
    const modes = buildPlayModesByCategory(false, courseLaunches);
    const { wheel } = buildPlayCategories(modes, false);
    const explore = wheel.find((c) => c.id === 'explore');
    expect(explore?.premiumLocked).toBeTrue();
    expect(modes.explore.some((m) => m.id === 'globe_find_locked')).toBeTrue();
  });

  it('includes every course launch id', () => {
    const modes = buildPlayModesByCategory(true, courseLaunches);
    const ids = modes.course.map((m) => m.id);
    expect(ids).toContain('learning_path');
    for (const launch of courseLaunches) {
      expect(ids).toContain(launch.id);
    }
  });

  it('includes every explore filter mark mode', () => {
    const modes = buildPlayModesByCategory(true, courseLaunches);
    for (const def of EXPLORE_FILTER_DEFS) {
      expect(modes.explore.some((m) => m.id === `mark_${def.id}`)).toBeTrue();
    }
  });

  it('lists a short settings play-mode set for the Play CTA', () => {
    const options = listSettingsPlayModes(true);
    expect(options.map((m) => m.id)).toEqual([
      'flag_pick_country',
      'flag_type_country',
      'capital_pick_country',
      'country_pick_capital',
      'globe_find',
      'map_find',
      'pass_play_flags',
      'pass_play_capitals',
      'pass_play_mixed',
    ]);
    expect(resolveSettingsPlayMode('map_find', true).id).toBe('map_find');
    expect(resolveSettingsPlayMode('unknown', true).id).toBe('flag_pick_country');
    expect(resolveSettingsPlayMode('globe_find_locked', true).id).toBe('globe_find');
    expect(resolveSettingsPlayMode('globe_find', false).id).toBe('globe_find_locked');
  });
});
