import { EXPLORE_FILTER_DEFS } from '../core/data/explore-filters';
import type { FreeChallengeMode } from '../core/data/play-tier.constants';
import type { AppIconId } from '../core/icons/app-icons.registry';
import type { CourseLaunchDef } from '../core/services/course-launch.service';
import type {
  PlayCategoryId,
  PlayCategorySlide,
  PlayModeSlide,
} from './play-mode.types';

const RECOGNITION_MODES: FreeChallengeMode[] = [
  'flag_pick_country',
  'flag_find_map',
  'flag_type_country',
  'capital_pick_country',
  'country_pick_capital',
];

export function challengeModeIcon(mode: FreeChallengeMode): AppIconId {
  switch (mode) {
    case 'flag_pick_country':
      return 'mode-flag-pick';
    case 'flag_find_map':
      return 'mode-flag-map';
    case 'flag_type_country':
      return 'mode-flag-type';
    case 'capital_pick_country':
      return 'mode-capital-pick';
    case 'country_pick_capital':
      return 'mode-country-capital';
    default:
      return 'mode-flag-pick';
  }
}

export function buildPlayModesByCategory(
  isSubscribed: boolean,
  courseLaunches: readonly CourseLaunchDef[],
): Record<PlayCategoryId, PlayModeSlide[]> {
  const recognition: PlayModeSlide[] = RECOGNITION_MODES.map((mode) => ({
    id: mode,
    icon: challengeModeIcon(mode),
    titleKey: `challenge.mode.${mode}`,
    categoryId: 'recognition',
    action: { type: 'free', mode },
    needsPlayGuard: true,
  }));

  const recall: PlayModeSlide[] = [
    ...RECOGNITION_MODES.map((mode) => ({
      id: `recall_${mode}`,
      icon: challengeModeIcon(mode),
      titleKey: `challenge.mode.${mode}`,
      subKey: 'play.recallModeSub',
      categoryId: 'recall' as const,
      action: { type: 'recall_challenge' as const, mode },
      needsPlayGuard: true,
    })),
    {
      id: 'knowledge_quiz',
      icon: 'mode-knowledge-quiz',
      titleKey: 'play.knowledgeQuizTitle',
      subKey: 'play.knowledgeQuizSub',
      categoryId: 'recall',
      action: { type: 'knowledge_quiz' },
      needsPlayGuard: true,
    },
    {
      id: 'facts_quiz',
      icon: 'mode-facts-quiz',
      titleKey: 'play.factsQuizTitle',
      subKey: 'play.factsQuizSub',
      categoryId: 'recall',
      action: { type: 'facts_quiz' },
      needsPlayGuard: true,
    },
  ];

  const course: PlayModeSlide[] = [
    {
      id: 'learning_path',
      icon: 'mode-learning-path',
      titleKey: 'play.learningTitle',
      subKey: 'play.learningSub',
      categoryId: 'course',
      action: { type: 'learning' },
      needsPlayGuard: false,
    },
    ...courseLaunches.map((launch) => ({
      id: launch.id,
      icon: launch.icon,
      titleKey: launch.titleKey,
      subKey: launch.subKey,
      categoryId: 'course' as const,
      action:
        launch.kind === 'learn'
          ? { type: 'learning_level' as const, levelId: launch.id }
          : launch.kind === 'facts_drill'
            ? {
                type: 'facts_drill' as const,
                levelId: launch.id,
                mixFlags: false,
              }
            : { type: 'course_challenge' as const, launchId: launch.id },
      needsPlayGuard: launch.kind === 'challenge' || launch.kind === 'facts_drill',
    })),
  ];

  const exploreMarkModes = EXPLORE_FILTER_DEFS.map((def) => ({
    id: `mark_${def.id}`,
    icon: def.icon,
    titleKey: def.titleKey,
    subKey: def.subKey,
    categoryId: 'explore' as const,
    action: { type: 'explore_mark' as const, filterId: def.id },
    needsPlayGuard: true,
  }));

  const explore: PlayModeSlide[] = isSubscribed
    ? [
        {
          id: 'globe_find',
          icon: 'mode-globe-find',
          titleKey: 'play.globeFindTitle',
          categoryId: 'explore',
          action: { type: 'globe' },
          needsPlayGuard: true,
        },
        {
          id: 'map_find',
          icon: 'mode-map-find',
          titleKey: 'play.mapFindTitle',
          categoryId: 'explore',
          action: { type: 'map' },
          needsPlayGuard: true,
        },
        ...exploreMarkModes,
      ]
    : [
        {
          id: 'globe_find_locked',
          icon: 'mode-globe-find',
          titleKey: 'play.globeFindTitle',
          categoryId: 'explore',
          action: { type: 'globe' },
          needsPlayGuard: false,
        },
        {
          id: 'map_find_locked',
          icon: 'mode-map-find',
          titleKey: 'play.mapFindTitle',
          categoryId: 'explore',
          action: { type: 'map' },
          needsPlayGuard: false,
        },
        ...exploreMarkModes.map((m) => ({ ...m, needsPlayGuard: false })),
      ];

  const together: PlayModeSlide[] = [
    {
      id: 'pass_play_flags',
      icon: 'mode-pass-flags',
      titleKey: 'passPlay.modeFlags',
      subKey: 'passPlay.modeFlagsSub',
      categoryId: 'together',
      action: { type: 'pass_play', mode: 'flag_pick_country' },
      needsPlayGuard: true,
    },
    {
      id: 'pass_play_capitals',
      icon: 'mode-pass-capitals',
      titleKey: 'passPlay.modeCapitals',
      subKey: 'passPlay.modeCapitalsSub',
      categoryId: 'together',
      action: { type: 'pass_play', mode: 'capital_pick_country' },
      needsPlayGuard: true,
    },
    {
      id: 'pass_play_mixed',
      icon: 'mode-pass-mixed',
      titleKey: 'passPlay.modeMixed',
      subKey: 'passPlay.modeMixedSub',
      categoryId: 'together',
      action: { type: 'pass_play', mode: 'country_pick_capital' },
      needsPlayGuard: true,
    },
    {
      id: 'pass_play_speed_flags',
      icon: 'mode-pass-speed',
      titleKey: 'passPlay.modeSpeedFlags',
      subKey: 'passPlay.modeSpeedSub',
      categoryId: 'together',
      action: {
        type: 'pass_play',
        mode: 'flag_pick_country',
        scoringStyle: 'buzzer',
      },
      needsPlayGuard: true,
    },
    {
      id: 'pass_play_speed_capitals',
      icon: 'mode-pass-speed',
      titleKey: 'passPlay.modeSpeedCapitals',
      subKey: 'passPlay.modeSpeedSub',
      categoryId: 'together',
      action: {
        type: 'pass_play',
        mode: 'capital_pick_country',
        scoringStyle: 'buzzer',
      },
      needsPlayGuard: true,
    },
    {
      id: 'pass_play_speed_mixed',
      icon: 'mode-pass-speed',
      titleKey: 'passPlay.modeSpeedMixed',
      subKey: 'passPlay.modeSpeedSub',
      categoryId: 'together',
      action: {
        type: 'pass_play',
        mode: 'country_pick_capital',
        scoringStyle: 'buzzer',
      },
      needsPlayGuard: true,
    },
  ];

  return { recognition, recall, course, explore, together };
}

export function buildPlayCategories(
  modesByCategory: Record<PlayCategoryId, PlayModeSlide[]>,
  isSubscribed: boolean,
): { wheel: PlayCategorySlide[]; recall: PlayCategorySlide } {
  const recall: PlayCategorySlide = {
    id: 'recall',
    icon: 'category-recall',
    titleKey: 'play.category.recall',
    hintKey: 'play.category.recallHint',
    modeCount: modesByCategory.recall.length,
  };
  const wheel: PlayCategorySlide[] = [
    {
      id: 'recognition',
      icon: 'category-recognition',
      titleKey: 'play.category.recognition',
      hintKey: 'play.category.recognitionHint',
      modeCount: modesByCategory.recognition.length,
    },
    {
      id: 'course',
      icon: 'category-course',
      titleKey: 'play.category.course',
      hintKey: 'play.category.courseHint',
      modeCount: modesByCategory.course.length,
    },
    {
      id: 'explore',
      icon: 'category-explore',
      titleKey: 'play.category.explore',
      hintKey: 'play.category.exploreHint',
      modeCount: modesByCategory.explore.length,
      premiumLocked: !isSubscribed,
    },
    {
      id: 'together',
      icon: 'category-together',
      titleKey: 'play.category.together',
      hintKey: 'play.category.togetherHint',
      modeCount: modesByCategory.together.length,
    },
  ];
  return { wheel, recall };
}

/** Flat list of every hub mode slide (for route tests). */
export function flattenPlayModes(
  modesByCategory: Record<PlayCategoryId, PlayModeSlide[]>,
): PlayModeSlide[] {
  return [
    ...modesByCategory.recognition,
    ...modesByCategory.recall,
    ...modesByCategory.course,
    ...modesByCategory.explore,
    ...modesByCategory.together,
  ];
}
