import {
  createPassPlaySession,
  passPlayIsBuzzer,
  passPlayTotalRounds,
} from './pass-play-session';

describe('pass-play-session', () => {
  it('creates buzzer session with scoring style', () => {
    const s = createPassPlaySession(['A', 'B'], 'flag_pick_country', 5, 'buzzer');
    expect(passPlayIsBuzzer(s)).toBeTrue();
    expect(passPlayTotalRounds(s)).toBe(10);
  });
});
