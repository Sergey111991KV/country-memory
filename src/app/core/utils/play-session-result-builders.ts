import type { PlaySessionResultPayload } from '../data/play-session-result.types';
import type { PassPlaySession } from '../services/pass-play-session';
import { passPlayWinnerIndex } from '../services/pass-play-session';

export function buildSoloSessionResult(input: {
  titleKey: string;
  doneHeaderKey: string;
  correct: number;
  total: number;
  subtitleKey?: string;
  subtitleParams?: Record<string, string | number>;
}): PlaySessionResultPayload {
  const percent =
    input.total > 0 ? Math.round((input.correct / input.total) * 100) : 0;
  return {
    variant: 'solo',
    titleKey: input.titleKey,
    subtitleKey: input.subtitleKey,
    subtitleParams: input.subtitleParams,
    doneHeaderKey: input.doneHeaderKey,
    correct: input.correct,
    total: input.total,
    percent,
  };
}

export function buildMapMarkSessionResult(input: {
  correct: number;
  wrong: number;
  missed: number;
  percent: number;
  filterTitleKey: string;
}): PlaySessionResultPayload {
  const total = input.correct + input.wrong + input.missed;
  return {
    variant: 'map_mark',
    titleKey: 'sessionResult.mapMarkTitle',
    subtitleKey: input.filterTitleKey,
    doneHeaderKey: 'mapMark.sessionDone',
    correct: input.correct,
    total: Math.max(total, 1),
    percent: input.percent,
    extraStatsKey: 'mapMark.stats',
    extraStatsParams: {
      correct: input.correct,
      wrong: input.wrong,
      missed: input.missed,
      percent: input.percent,
    },
  };
}

export function buildPassPlaySessionResult(
  session: PassPlaySession,
): PlaySessionResultPayload {
  const winnerIndex = passPlayWinnerIndex(session);
  const maxScore = Math.max(...session.scores, 0);
  const winners = session.scores.filter((s) => s === maxScore).length;
  const isTie = winners > 1;

  const ranked = session.players
    .map((name, index) => ({
      name,
      score: session.scores[index] ?? 0,
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row, rankIndex) => ({
      name: row.name,
      score: row.score,
      rank: rankIndex + 1,
      isWinner: !isTie && row.index === winnerIndex,
    }));

  const modeSubtitleKey = (() => {
    if (session.scoringStyle === 'buzzer') {
      if (session.mode === 'capital_pick_country') {
        return 'passPlay.modeSpeedCapitals';
      }
      if (session.mode === 'country_pick_capital') {
        return 'passPlay.modeSpeedMixed';
      }
      return 'passPlay.modeSpeedFlags';
    }
    if (session.mode === 'capital_pick_country') {
      return 'passPlay.modeCapitals';
    }
    if (session.mode === 'country_pick_capital') {
      return 'passPlay.modeMixed';
    }
    return 'passPlay.modeFlags';
  })();

  return {
    variant: 'pass_play',
    titleKey: isTie ? 'sessionResult.passPlayTie' : 'sessionResult.passPlayTitle',
    subtitleKey: modeSubtitleKey,
    doneHeaderKey: 'sessionResult.passPlayDone',
    correct: maxScore,
    total: session.roundsPerPlayer,
    players: ranked,
    isTie,
    passPlayMode: session.mode,
    passPlayScoringStyle: session.scoringStyle,
    passPlayPlayers: [...session.players],
  };
}
