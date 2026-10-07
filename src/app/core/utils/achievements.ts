import type { AppIconId } from '../icons/app-icons.registry';
import type { ContinentId } from '../data/country.types';

/** Snapshot of everything achievements are computed from (pure, testable). */
export interface AchievementStats {
  correctTotal: number;
  longestStreakDays: number;
  /** Countries with Leitner box >= LEARNED_BOX. */
  learnedCountries: number;
  /** Learned / total per continent. */
  continents: Partial<Record<ContinentId, { learned: number; total: number }>>;
  blitzBest: number;
  dailySolved: number;
  dailyBestStreak: number;
  weakFixed: number;
}

export interface AchievementView {
  id: string;
  icon: AppIconId;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  descKey: string;
  descParams?: Record<string, string | number>;
  current: number;
  target: number;
  unlocked: boolean;
  percent: number;
}

/** A country counts as "learned" from this Leitner box (3+ correct in a row, spaced). */
export const LEARNED_BOX = 3;

interface Def {
  id: string;
  icon: AppIconId;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  descKey: string;
  descParams?: Record<string, string | number>;
  target: number;
  value: (s: AchievementStats) => number;
}

const tier = (n: number, gold: number, silver: number): AppIconId =>
  n >= gold ? 'medal-gold' : n >= silver ? 'medal-silver' : 'medal-bronze';

const CONTINENTS: { id: ContinentId; icon: AppIconId }[] = [
  { id: 'africa', icon: 'course-africa' },
  { id: 'asia', icon: 'course-asia' },
  { id: 'europe', icon: 'course-europe' },
  { id: 'americas', icon: 'course-americas' },
  { id: 'oceania', icon: 'course-oceania' },
];

const DEFS: Def[] = [
  {
    id: 'first_correct',
    icon: 'result-spark',
    titleKey: 'ach.firstCorrect',
    descKey: 'ach.firstCorrectDesc',
    target: 1,
    value: (s) => s.correctTotal,
  },
  ...[100, 500, 2000].map(
    (n): Def => ({
      id: `correct_${n}`,
      icon: tier(n, 2000, 500),
      titleKey: 'ach.correctN',
      titleParams: { n },
      descKey: 'ach.correctNDesc',
      descParams: { n },
      target: n,
      value: (s) => s.correctTotal,
    }),
  ),
  ...[3, 7, 30].map(
    (n): Def => ({
      id: `streak_${n}`,
      icon: 'result-trophy',
      titleKey: 'ach.streakN',
      titleParams: { n },
      descKey: 'ach.streakNDesc',
      descParams: { n },
      target: n,
      value: (s) => s.longestStreakDays,
    }),
  ),
  ...[10, 50, 100, 195].map(
    (n): Def => ({
      id: `learned_${n}`,
      icon: tier(n, 100, 50),
      titleKey: 'ach.learnedN',
      titleParams: { n },
      descKey: 'ach.learnedNDesc',
      descParams: { n },
      target: n,
      value: (s) => s.learnedCountries,
    }),
  ),
  ...CONTINENTS.map(
    ({ id, icon }): Def => ({
      id: `continent_${id}`,
      icon,
      titleKey: `ach.continent.${id}`,
      descKey: 'ach.continentDesc',
      target: 1,
      // Completed when every country of the continent is learned (scaled to 0..1 below).
      value: () => 0,
    }),
  ),
  ...[20, 40].map(
    (n): Def => ({
      id: `blitz_${n}`,
      icon: 'mode-pass-speed',
      titleKey: 'ach.blitzN',
      titleParams: { n },
      descKey: 'ach.blitzNDesc',
      descParams: { n },
      target: n,
      value: (s) => s.blitzBest,
    }),
  ),
  {
    id: 'daily_first',
    icon: 'ui-daily-goal',
    titleKey: 'ach.dailyFirst',
    descKey: 'ach.dailyFirstDesc',
    target: 1,
    value: (s) => s.dailySolved,
  },
  {
    id: 'daily_streak_7',
    icon: 'ui-daily-goal',
    titleKey: 'ach.dailyStreak',
    titleParams: { n: 7 },
    descKey: 'ach.dailyStreakDesc',
    descParams: { n: 7 },
    target: 7,
    value: (s) => s.dailyBestStreak,
  },
  {
    id: 'weak_fixed_10',
    icon: 'result-target',
    titleKey: 'ach.weakFixed',
    titleParams: { n: 10 },
    descKey: 'ach.weakFixedDesc',
    descParams: { n: 10 },
    target: 10,
    value: (s) => s.weakFixed,
  },
];

export function computeAchievements(stats: AchievementStats): AchievementView[] {
  return DEFS.map((d) => {
    let current: number;
    let target = d.target;
    const continent = d.id.startsWith('continent_')
      ? stats.continents[d.id.slice('continent_'.length) as ContinentId]
      : undefined;
    if (d.id.startsWith('continent_')) {
      current = continent?.learned ?? 0;
      target = Math.max(1, continent?.total ?? 1);
    } else {
      current = d.value(stats);
    }
    const capped = Math.min(current, target);
    return {
      id: d.id,
      icon: d.icon,
      titleKey: d.titleKey,
      titleParams: d.titleParams,
      descKey: d.descKey,
      descParams: d.descParams ?? (continent ? { n: target } : undefined),
      current: capped,
      target,
      unlocked: current >= target,
      percent: Math.round((capped / target) * 100),
    };
  }).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.percent - a.percent);
}

/** Longest run of consecutive calendar days (YYYY-MM-DD keys). */
export function longestDayStreak(dayKeys: Iterable<string>): number {
  const days = [...new Set(dayKeys)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of days) {
    const t = Date.parse(`${key}T12:00:00Z`);
    run = prev !== null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}
