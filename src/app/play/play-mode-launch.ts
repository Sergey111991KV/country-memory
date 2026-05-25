import type { CourseLaunchDef } from '../core/services/course-launch.service';
import type { PlayModeAction } from './play-mode.types';

export type PlayLaunchKind = 'route' | 'paywall' | 'blocked';

export interface PlayLaunchRoute {
  kind: 'route';
  /** Router navigate commands, e.g. ['/tabs/play/challenge', 'flag_pick_country'] */
  commands: (string | Record<string, string>)[];
  setsPool: boolean;
  premiumOnly: boolean;
}

export interface PlayLaunchPaywall {
  kind: 'paywall';
}

export function resolvePlayModeLaunch(
  action: PlayModeAction,
  options: {
    isSubscribed: boolean;
    courseLaunch?: CourseLaunchDef;
  },
): PlayLaunchRoute | PlayLaunchPaywall {
  const premiumExplore = (a: PlayModeAction): boolean =>
    a.type === 'globe' || a.type === 'map' || a.type === 'explore_mark';

  if (premiumExplore(action) && !options.isSubscribed) {
    return { kind: 'paywall' };
  }

  switch (action.type) {
    case 'free':
    case 'recall_challenge':
      return {
        kind: 'route',
        commands: ['/tabs/play/challenge', action.mode],
        setsPool: true,
        premiumOnly: false,
      };
    case 'pass_play':
      return {
        kind: 'route',
        commands: ['/tabs/play/pass-play', action.mode],
        setsPool: false,
        premiumOnly: false,
      };
    case 'knowledge_quiz':
      return {
        kind: 'route',
        commands: ['/tabs/play/knowledge-quiz'],
        setsPool: false,
        premiumOnly: false,
      };
    case 'facts_quiz':
      return {
        kind: 'route',
        commands: ['/tabs/play/facts-quiz'],
        setsPool: false,
        premiumOnly: false,
      };
    case 'learning':
      return {
        kind: 'route',
        commands: ['/tabs/play/learn'],
        setsPool: false,
        premiumOnly: false,
      };
    case 'learning_level':
      return {
        kind: 'route',
        commands: ['/tabs/play/learn', action.levelId],
        setsPool: true,
        premiumOnly: false,
      };
    case 'facts_drill':
      return {
        kind: 'route',
        commands: ['/tabs/play/facts-drill'],
        setsPool: true,
        premiumOnly: false,
      };
    case 'course_challenge': {
      const launch = options.courseLaunch;
      if (!launch?.challengeMode) {
        return { kind: 'paywall' };
      }
      return {
        kind: 'route',
        commands: ['/tabs/play/challenge', launch.challengeMode],
        setsPool: true,
        premiumOnly: false,
      };
    }
    case 'globe':
      return {
        kind: 'route',
        commands: ['/tabs/play/globe-find'],
        setsPool: false,
        premiumOnly: true,
      };
    case 'map':
      return {
        kind: 'route',
        commands: ['/tabs/play/map-find'],
        setsPool: false,
        premiumOnly: true,
      };
    case 'explore_mark':
      return {
        kind: 'route',
        commands: ['/tabs/play/map-mark', action.filterId],
        setsPool: false,
        premiumOnly: true,
      };
    default:
      return { kind: 'paywall' };
  }
}
