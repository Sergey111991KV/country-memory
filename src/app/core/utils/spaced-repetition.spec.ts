import type { CountryMastery } from '../data/country.types';
import { dueAtFor, nextBox, reviewWeight, smartPick } from './spaced-repetition';

const m = (over: Partial<CountryMastery>): CountryMastery => ({
  countryId: 'XX',
  timesSeen: 1,
  timesCorrect: 1,
  lastAt: null,
  ...over,
});

describe('spaced-repetition', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');

  it('moves boxes up on success and resets on mistakes', () => {
    expect(nextBox(undefined, true)).toBe(1);
    expect(nextBox(4, true)).toBe(5);
    expect(nextBox(5, true)).toBe(5);
    expect(nextBox(3, false)).toBe(0);
    expect(dueAtFor(3, new Date(now))).toBe('2026-10-14T12:00:00.000Z');
  });

  it('weights missed and due countries above learned ones', () => {
    const missed = reviewWeight(m({ box: 0, dueAt: new Date(now).toISOString() }), now);
    const unseen = reviewWeight(undefined, now);
    const learned = reviewWeight(m({ box: 4, dueAt: '2026-11-01T00:00:00Z' }), now);
    expect(missed).toBeGreaterThan(unseen);
    expect(unseen).toBeGreaterThan(learned);
  });

  it('never repeats excluded items while others remain', () => {
    const items = ['A', 'B', 'C'];
    for (let i = 0; i < 50; i++) {
      const pick = smartPick(items, {
        idOf: (x) => x,
        mastery: () => undefined,
        exclude: new Set(['A', 'B']),
      });
      expect(pick).toBe('C');
    }
    expect(
      smartPick(items, { idOf: (x) => x, mastery: () => undefined, exclude: new Set(items) }),
    ).not.toBeNull();
    expect(smartPick([], { idOf: (x: string) => x, mastery: () => undefined })).toBeNull();
  });

  it('prefers the missed country most of the time', () => {
    const mastery = (iso: string) =>
      iso === 'MISS'
        ? m({ box: 0, dueAt: new Date(now - 1000).toISOString(), timesCorrect: 0 })
        : m({ box: 5, dueAt: '2027-01-01T00:00:00Z' });
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      if (smartPick(['MISS', 'A', 'B', 'C'], { idOf: (x) => x, mastery, now }) === 'MISS') {
        hits++;
      }
    }
    expect(hits).toBeGreaterThan(150);
  });
});
