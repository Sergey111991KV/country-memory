import type { ExploreFilterId } from '../core/data/explore-filters';
import type { FreeChallengeMode } from '../core/data/play-tier.constants';
import type { AppIconId } from '../core/icons/app-icons.registry';
import type { CourseLaunchId } from '../core/services/course-launch.service';
import type { PassPlayScoringStyle } from '../core/services/pass-play-session';

export type PlayModeAction =
  | { type: 'free'; mode: FreeChallengeMode }
  | { type: 'recall_challenge'; mode: FreeChallengeMode }
  | {
      type: 'pass_play';
      mode: FreeChallengeMode;
      scoringStyle?: PassPlayScoringStyle;
    }
  | { type: 'knowledge_quiz' }
  | { type: 'facts_quiz' }
  | { type: 'learning' }
  | { type: 'course_challenge'; launchId: CourseLaunchId }
  | { type: 'learning_level'; levelId: string }
  | { type: 'facts_drill'; levelId?: string; mixFlags?: boolean }
  | { type: 'globe' }
  | { type: 'map' }
  | { type: 'explore_atlas' }
  | { type: 'explore_mark'; filterId: ExploreFilterId };

export type PlayCategoryId =
  | 'recognition'
  | 'recall'
  | 'course'
  | 'explore'
  | 'together';

export interface PlayModeSlide {
  id: string;
  icon: AppIconId;
  titleKey: string;
  subKey?: string;
  categoryId: PlayCategoryId;
  action: PlayModeAction;
  needsPlayGuard: boolean;
}

export interface PlayCategorySlide {
  id: PlayCategoryId;
  icon: AppIconId;
  titleKey: string;
  hintKey?: string;
  modeCount: number;
  premiumLocked?: boolean;
}
