import {
  buildPassPlaySessionResult,
  buildSoloSessionResult,
} from './play-session-result-builders';
import {
  createPassPlaySession,
  passPlayConfirmBuzzCorrect,
  passPlayRecordBuzz,
  passPlayRejectBuzz,
} from '../services/pass-play-session';

describe('play-session-result-builders', () => {
  it('builds solo percent from correct/total', () => {
    const r = buildSoloSessionResult({
      titleKey: 'sessionResult.quizTitle',
      doneHeaderKey: 'quiz.sessionDone',
      correct: 7,
      total: 10,
    });
    expect(r.variant).toBe('solo');
    expect(r.percent).toBe(70);
  });

  it('ranks pass & play players and detects tie', () => {
    const session = createPassPlaySession(['A', 'B'], 'flag_pick_country', 2);
    session.scores = [2, 2];
    const r = buildPassPlaySessionResult(session);
    expect(r.variant).toBe('pass_play');
    expect(r.isTie).toBeTrue();
    expect(r.players?.length).toBe(2);
    expect(r.players?.every((p) => !p.isWinner)).toBeTrue();
  });

  it('awards point on confirmed buzz', () => {
    let session = createPassPlaySession(['A', 'B'], 'flag_pick_country', 2, 'buzzer');
    session = passPlayRecordBuzz(session, 1);
    session = passPlayConfirmBuzzCorrect(session);
    expect(session.scores[1]).toBe(1);
    expect(session.roundIndex).toBe(2);
    expect(session.buzzPlayerIndex).toBeNull();
  });

  it('rejects buzz without point', () => {
    let session = createPassPlaySession(['A', 'B'], 'flag_pick_country', 2, 'buzzer');
    session = passPlayRecordBuzz(session, 0);
    session = passPlayRejectBuzz(session);
    expect(session.scores[0]).toBe(0);
    expect(session.roundIndex).toBe(2);
  });

  it('marks single winner in pass & play', () => {
    const session = createPassPlaySession(['A', 'B', 'C'], 'flag_pick_country', 3);
    session.scores = [1, 4, 2];
    const r = buildPassPlaySessionResult(session);
    expect(r.isTie).toBeFalse();
    const winner = r.players?.find((p) => p.isWinner);
    expect(winner?.name).toBe('B');
    expect(winner?.rank).toBe(1);
  });
});
