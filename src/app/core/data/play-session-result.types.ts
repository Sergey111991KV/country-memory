import type { FreeChallengeMode } from './play-tier.constants';
import type { PassPlayScoringStyle } from '../services/pass-play-session';

export type PlaySessionResultVariant = 'solo' | 'pass_play' | 'map_mark';

export interface PlaySessionResultPlayerRow {
  name: string;
  score: number;
  rank: number;
  isWinner: boolean;
}

export interface PlaySessionResultPayload {
  variant: PlaySessionResultVariant;
  /** Shown as main heading on the results screen */
  titleKey: string;
  /** Optional subtitle (mode name, filter title, etc.) */
  subtitleKey?: string;
  subtitleParams?: Record<string, string | number>;
  doneHeaderKey: string;
  correct: number;
  total: number;
  /** 0–100 for map-mark style results */
  percent?: number;
  players?: PlaySessionResultPlayerRow[];
  isTie?: boolean;
  /** Pass & play rematch */
  passPlayMode?: FreeChallengeMode;
  passPlayScoringStyle?: PassPlayScoringStyle;
  passPlayPlayers?: string[];
  extraStatsKey?: string;
  extraStatsParams?: Record<string, string | number>;
}
