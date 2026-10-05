import { dailyPuzzleNumber, localDateKey, pickDaily, previousDateKey } from './daily-seed';

describe('daily-seed', () => {
  it('formats and steps local date keys', () => {
    expect(localDateKey(new Date(2026, 0, 5, 9))).toBe('2026-01-05');
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
    expect(dailyPuzzleNumber('2026-01-01')).toBe(1);
    expect(dailyPuzzleNumber('2026-01-31')).toBe(31);
  });

  it('is deterministic per day', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(pickDaily(items, '2026-10-05')).toBe(pickDaily(items, '2026-10-05'));
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'];
    const picks = new Set(days.map((d) => pickDaily(items, d)));
    expect(picks.size).toBeGreaterThan(1);
    expect(pickDaily([], '2026-10-05')).toBeNull();
  });
});
