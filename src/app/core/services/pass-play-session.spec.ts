import {
  createPassPlaySession,
  passPlayIsBuzzer,
  passPlayTotalRounds,
} from './pass-play-session';
import type { FreeChallengeMode } from '../data/play-tier.constants';

describe('pass-play-session', () => {
  const modes: FreeChallengeMode[] = [
    'flag_pick_country',
    'capital_pick_country',
    'country_pick_capital',
  ];

  it('creates buzzer session with scoring style', () => {
    const s = createPassPlaySession(['A', 'B'], 'flag_pick_country', 5, 'buzzer');
    expect(passPlayIsBuzzer(s)).toBeTrue();
    expect(passPlayTotalRounds(s)).toBe(10);
  });

  for (const mode of modes) {
    it(`creates turns session for mode ${mode}`, () => {
      const s = createPassPlaySession(['A', 'B', 'C'], mode, 4, 'turns');
      expect(s.mode).toBe(mode);
      expect(passPlayIsBuzzer(s)).toBeFalse();
      expect(passPlayTotalRounds(s)).toBe(12);
      expect(s.scores).toEqual([0, 0, 0]);
    });
  }
});
