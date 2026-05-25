import type { FreeChallengeMode } from '../data/play-tier.constants';

/** turns = each player answers in rotation; buzzer = tap who answered first. */
export type PassPlayScoringStyle = 'turns' | 'buzzer';

export interface PassPlaySession {
  players: string[];
  turnIndex: number;
  scores: number[];
  mode: FreeChallengeMode;
  roundsPerPlayer: number;
  roundIndex: number;
  scoringStyle: PassPlayScoringStyle;
  /** Set during buzzer feedback (who tapped first this round). */
  buzzPlayerIndex: number | null;
}

export function createPassPlaySession(
  players: string[],
  mode: FreeChallengeMode,
  roundsPerPlayer = 5,
  scoringStyle: PassPlayScoringStyle = 'turns',
): PassPlaySession {
  return {
    players,
    turnIndex: 0,
    scores: players.map(() => 0),
    mode,
    roundsPerPlayer,
    roundIndex: 1,
    scoringStyle,
    buzzPlayerIndex: null,
  };
}

export function passPlayIsBuzzer(session: PassPlaySession): boolean {
  return session.scoringStyle === 'buzzer';
}

export function passPlayTotalRounds(session: PassPlaySession): number {
  return session.roundsPerPlayer * session.players.length;
}

export function passPlayCurrentPlayer(session: PassPlaySession): string {
  return session.players[session.turnIndex] ?? '';
}

export function passPlayAdvanceTurn(
  session: PassPlaySession,
  correct: boolean,
): PassPlaySession {
  const scores = [...session.scores];
  if (correct) {
    scores[session.turnIndex] = (scores[session.turnIndex] ?? 0) + 1;
  }
  const nextTurn = (session.turnIndex + 1) % session.players.length;
  return {
    ...session,
    scores,
    turnIndex: nextTurn,
    roundIndex: session.roundIndex + 1,
  };
}

export function passPlayIsComplete(session: PassPlaySession): boolean {
  return session.roundIndex > passPlayTotalRounds(session);
}

export function passPlayWinnerIndex(session: PassPlaySession): number {
  let best = 0;
  for (let i = 1; i < session.scores.length; i++) {
    if ((session.scores[i] ?? 0) > (session.scores[best] ?? 0)) {
      best = i;
    }
  }
  return best;
}

export function passPlayRecordBuzz(
  session: PassPlaySession,
  playerIndex: number,
): PassPlaySession {
  return { ...session, buzzPlayerIndex: playerIndex };
}

export function passPlayConfirmBuzzCorrect(session: PassPlaySession): PassPlaySession {
  const idx = session.buzzPlayerIndex;
  if (idx === null) {
    return passPlayAdvanceSkip(session);
  }
  const scores = [...session.scores];
  scores[idx] = (scores[idx] ?? 0) + 1;
  return {
    ...session,
    scores,
    buzzPlayerIndex: null,
    roundIndex: session.roundIndex + 1,
  };
}

export function passPlayRejectBuzz(session: PassPlaySession): PassPlaySession {
  return {
    ...session,
    buzzPlayerIndex: null,
    roundIndex: session.roundIndex + 1,
  };
}

export function passPlayAdvanceSkip(session: PassPlaySession): PassPlaySession {
  return {
    ...session,
    buzzPlayerIndex: null,
    roundIndex: session.roundIndex + 1,
  };
}
