import type { LearningLevelDef } from '../core/services/learning-path.service';
import { playDebug } from '../core/utils/play-debug';
import type { PlaySessionMeta } from '../core/services/play-session.service';

export interface LevelLaunchPlan {
  commands: string[];
  meta: PlaySessionMeta;
}

/** Maps learning-path level topics to the correct game screen. */
export function resolveLevelLaunchPlan(level: LearningLevelDef): LevelLaunchPlan {
  const topics = level.topics;
  const onlyFacts =
    topics.includes('facts') &&
    !topics.includes('flags') &&
    !topics.includes('capitals');
  const onlyCapitals =
    topics.includes('capitals') &&
    !topics.includes('flags') &&
    !topics.includes('facts');
  const mixedFacts =
    topics.includes('facts') &&
    (topics.includes('flags') || topics.includes('capitals'));

  if (onlyFacts) {
    const plan: LevelLaunchPlan = {
      commands: ['/tabs/play/facts-drill'],
      meta: { kind: 'facts_drill', levelId: level.id, mixFlags: false },
    };
    playDebug('LevelRoute', 'onlyFacts', plan);
    return plan;
  }

  if (mixedFacts) {
    const plan: LevelLaunchPlan = {
      commands: ['/tabs/play/facts-drill'],
      meta: { kind: 'facts_mixed', levelId: level.id, mixFlags: true },
    };
    playDebug('LevelRoute', 'mixedFacts', plan);
    return plan;
  }

  if (onlyCapitals) {
    const plan: LevelLaunchPlan = {
      commands: ['/tabs/play/challenge', 'capital_pick_country'],
      meta: { kind: 'default', levelId: level.id },
    };
    playDebug('LevelRoute', 'onlyCapitals', plan);
    return plan;
  }

  const flagsAndCapitals =
    topics.includes('flags') && topics.includes('capitals');
  if (flagsAndCapitals) {
    const plan: LevelLaunchPlan = {
      commands: ['/tabs/play/challenge', 'flag_pick_country'],
      meta: { kind: 'continent_mixed', levelId: level.id },
    };
    playDebug('LevelRoute', 'flagsAndCapitals', plan);
    return plan;
  }

  const plan: LevelLaunchPlan = {
    commands: ['/tabs/play/challenge', 'flag_pick_country'],
    meta: { kind: 'default', levelId: level.id },
  };
  playDebug('LevelRoute', 'defaultFlags', plan);
  return plan;
}
