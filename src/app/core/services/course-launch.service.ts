import { Injectable, inject } from '@angular/core';

import type { FreeChallengeMode } from '../data/play-tier.constants';
import type { AppIconId } from '../icons/app-icons.registry';
import type { ContinentId, Country } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { PlayPoolService } from './play-pool.service';

export type CourseLaunchId =
  | 'continent-africa'
  | 'continent-asia'
  | 'continent-europe'
  | 'continent-oceania'
  | 'continent-americas'
  | 'capitals-free'
  | 'capitals-world';

export interface CourseLaunchDef {
  id: CourseLaunchId;
  icon: AppIconId;
  titleKey: string;
  subKey: string;
  /** Direct challenge, facts drill, or learning-path level screen. */
  kind: 'challenge' | 'learn' | 'facts_drill';
  challengeMode?: FreeChallengeMode;
  /** Alternate flag/capital rounds within continent challenge. */
  drillStyle?: 'flags_only' | 'mixed';
}

const CONTINENT_BY_LAUNCH: Record<string, ContinentId> = {
  'continent-africa': 'africa',
  'continent-asia': 'asia',
  'continent-europe': 'europe',
  'continent-oceania': 'oceania',
  'continent-americas': 'americas',
};

const MAX_CONTINENT_COUNTRIES = 14;

@Injectable({ providedIn: 'root' })
export class CourseLaunchService {
  private readonly catalog = inject(CountriesCatalogService);
  private readonly playPool = inject(PlayPoolService);

  readonly launches: CourseLaunchDef[] = [
    {
      id: 'continent-africa',
      icon: 'course-africa',
      titleKey: 'course.continent.africa',
      subKey: 'course.continent.sub',
      kind: 'challenge',
      challengeMode: 'flag_pick_country',
    },
    {
      id: 'continent-asia',
      icon: 'course-asia',
      titleKey: 'course.continent.asia',
      subKey: 'course.continent.mixedSub',
      kind: 'challenge',
      challengeMode: 'flag_pick_country',
      drillStyle: 'mixed',
    },
    {
      id: 'continent-europe',
      icon: 'course-europe',
      titleKey: 'course.continent.europe',
      subKey: 'course.continent.mixedSub',
      kind: 'challenge',
      challengeMode: 'flag_pick_country',
      drillStyle: 'mixed',
    },
    {
      id: 'continent-oceania',
      icon: 'course-oceania',
      titleKey: 'course.continent.oceania',
      subKey: 'course.continent.sub',
      kind: 'challenge',
      challengeMode: 'flag_pick_country',
    },
    {
      id: 'continent-americas',
      icon: 'course-americas',
      titleKey: 'course.continent.americas',
      subKey: 'course.continent.sub',
      kind: 'challenge',
      challengeMode: 'flag_pick_country',
    },
    {
      id: 'capitals-free',
      icon: 'course-capitals',
      titleKey: 'course.capitals.free',
      subKey: 'course.capitals.freeSub',
      kind: 'challenge',
      challengeMode: 'capital_pick_country',
    },
    {
      id: 'capitals-world',
      icon: 'course-capitals',
      titleKey: 'course.capitals.world',
      subKey: 'course.capitals.worldSub',
      kind: 'challenge',
      challengeMode: 'country_pick_capital',
    },
  ];

  getLaunch(id: CourseLaunchId): CourseLaunchDef | undefined {
    return this.launches.find((l) => l.id === id);
  }

  async resolvePool(id: CourseLaunchId): Promise<Country[]> {
    await this.catalog.ensureLoaded();
    const continent = CONTINENT_BY_LAUNCH[id];
    if (continent) {
      return this.catalog
        .getAll()
        .filter((c) => c.continent === continent)
        .slice(0, MAX_CONTINENT_COUNTRIES);
    }
    if (id === 'capitals-free') {
      return this.playPool.getFreePool();
    }
    if (id === 'capitals-world') {
      return this.playPool.poolForTier();
    }
    return [];
  }
}
