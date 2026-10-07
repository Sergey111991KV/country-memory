import type { CountryMastery } from '../data/country.types';

/**
 * Leitner-style spaced repetition for country questions.
 *
 * A correct answer moves a country up one box (longer interval), a mistake drops
 * it to box 0 so it comes back in the next sessions. Selection is weighted:
 * due and never-seen countries are much more likely than ones learned recently.
 */

export const MAX_BOX = 5;
/** Review interval in days per box. */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;

const DAY_MS = 86_400_000;

export function nextBox(prev: number | undefined, correct: boolean): number {
  if (!correct) {
    return 0;
  }
  return Math.min(MAX_BOX, (prev ?? 0) + 1);
}

export function dueAtFor(box: number, at: Date): string {
  const days = BOX_INTERVAL_DAYS[Math.max(0, Math.min(MAX_BOX, box))]!;
  return new Date(at.getTime() + days * DAY_MS).toISOString();
}

/** Selection weight for one country (higher = more likely to be asked). */
export function reviewWeight(m: CountryMastery | undefined, now: number): number {
  if (!m || m.timesSeen === 0) {
    return 4;
  }
  const box = m.box ?? (m.timesCorrect >= m.timesSeen ? 1 : 0);
  const due = m.dueAt ? Date.parse(m.dueAt) <= now : true;
  if (due) {
    // Missed countries (box 0) are the most urgent.
    return 6 + (MAX_BOX - box);
  }
  return 1 / (box + 1);
}

export interface SmartPickOptions<T> {
  /** ISO2 of an item. */
  idOf: (item: T) => string;
  mastery: (iso2: string) => CountryMastery | undefined;
  /** Already asked in this session — skipped unless nothing else is left. */
  exclude?: ReadonlySet<string>;
  now?: number;
  random?: () => number;
}

/** Weighted random pick; never repeats `exclude` while other items remain. */
export function smartPick<T>(items: readonly T[], opts: SmartPickOptions<T>): T | null {
  if (items.length === 0) {
    return null;
  }
  const rnd = opts.random ?? Math.random;
  const now = opts.now ?? Date.now();
  const fresh = opts.exclude?.size
    ? items.filter((it) => !opts.exclude!.has(opts.idOf(it)))
    : items;
  const source = fresh.length > 0 ? fresh : items;
  const weights = source.map((it) => reviewWeight(opts.mastery(opts.idOf(it)), now));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < source.length; i++) {
    r -= weights[i]!;
    if (r <= 0) {
      return source[i]!;
    }
  }
  return source[source.length - 1]!;
}
