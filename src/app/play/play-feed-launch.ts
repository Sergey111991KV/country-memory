import type { HomeFeedCardKind } from '../core/services/home-feed.service';
import type { FactsDrillRoundKind } from '../core/utils/facts-drill-options';
import type { PlaySessionMeta } from '../core/services/play-session.service';

export interface FeedPlayLaunch {
  commands: (string | Record<string, string>)[];
  meta: PlaySessionMeta;
}

/** Maps a hub card kind to a full game session (used if navigating away from hub). */
export function resolveFeedCardLaunch(kind: HomeFeedCardKind): FeedPlayLaunch {
  switch (kind) {
    case 'flag':
      return {
        commands: ['/tabs/play/challenge', 'flag_pick_country'],
        meta: { kind: 'default' },
      };
    case 'capital':
      return {
        commands: ['/tabs/play/challenge', 'capital_pick_country'],
        meta: { kind: 'default' },
      };
    case 'currency':
      return {
        commands: ['/tabs/play/facts-drill'],
        meta: { kind: 'facts_drill', factsDrillKind: 'currency' },
      };
    case 'language':
      return {
        commands: ['/tabs/play/facts-drill'],
        meta: { kind: 'facts_drill', factsDrillKind: 'language' },
      };
    case 'fact':
      return {
        commands: ['/tabs/play/facts-quiz'],
        meta: { kind: 'default' },
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function feedPromptKey(kind: HomeFeedCardKind): string {
  switch (kind) {
    case 'flag':
      return 'home.feed.flagPrompt';
    case 'capital':
      return 'home.feed.capitalPrompt';
    case 'currency':
      return 'home.feed.currencyPrompt';
    case 'language':
      return 'home.feed.languagePrompt';
    case 'fact':
      return 'home.feed.factPrompt';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isFactsDrillKind(
  value: FactsDrillRoundKind | null | undefined,
): value is FactsDrillRoundKind {
  return (
    value === 'population' ||
    value === 'language' ||
    value === 'currency' ||
    value === 'capital' ||
    value === 'flag'
  );
}
