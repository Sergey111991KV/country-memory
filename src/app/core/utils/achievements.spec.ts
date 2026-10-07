import { computeAchievements, longestDayStreak, type AchievementStats } from './achievements';

const base: AchievementStats = {
  correctTotal: 0,
  longestStreakDays: 0,
  learnedCountries: 0,
  continents: {},
  blitzBest: 0,
  dailySolved: 0,
  dailyBestStreak: 0,
  weakFixed: 0,
};

describe('achievements', () => {
  it('starts with nothing unlocked', () => {
    expect(computeAchievements(base).some((a) => a.unlocked)).toBeFalse();
  });

  it('unlocks by thresholds and sorts unlocked first', () => {
    const list = computeAchievements({
      ...base,
      correctTotal: 120,
      longestStreakDays: 7,
      continents: { europe: { learned: 44, total: 44 }, asia: { learned: 10, total: 48 } },
    });
    const byId = new Map(list.map((a) => [a.id, a]));
    expect(byId.get('first_correct')!.unlocked).toBeTrue();
    expect(byId.get('correct_100')!.unlocked).toBeTrue();
    expect(byId.get('correct_500')!.unlocked).toBeFalse();
    expect(byId.get('correct_500')!.percent).toBe(24);
    expect(byId.get('streak_7')!.unlocked).toBeTrue();
    expect(byId.get('continent_europe')!.unlocked).toBeTrue();
    expect(byId.get('continent_asia')!.current).toBe(10);
    expect(list[0]!.unlocked).toBeTrue();
  });

  it('computes the longest consecutive-day streak', () => {
    expect(longestDayStreak([])).toBe(0);
    expect(longestDayStreak(['2026-01-01', '2026-01-02', '2026-01-04'])).toBe(2);
    expect(longestDayStreak(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-01'])).toBe(3);
  });
});
