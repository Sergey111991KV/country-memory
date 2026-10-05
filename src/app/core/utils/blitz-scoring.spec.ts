import {
  BLITZ_DURATION_MS,
  BLITZ_WRONG_PENALTY_MS,
  blitzPoints,
  blitzRemainingMs,
} from './blitz-scoring';

describe('blitz-scoring', () => {
  it('doubles points from a streak of five', () => {
    expect(blitzPoints(1)).toBe(1);
    expect(blitzPoints(4)).toBe(1);
    expect(blitzPoints(5)).toBe(2);
    expect(blitzPoints(12)).toBe(2);
  });

  it('subtracts penalties and clamps at zero', () => {
    expect(blitzRemainingMs(0, 0)).toBe(BLITZ_DURATION_MS);
    expect(blitzRemainingMs(10_000, BLITZ_WRONG_PENALTY_MS)).toBe(47_000);
    expect(blitzRemainingMs(59_000, 6_000)).toBe(0);
  });
});
