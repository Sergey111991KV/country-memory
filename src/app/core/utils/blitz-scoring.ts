/** Blitz (60-second) arcade rules. */

export const BLITZ_DURATION_MS = 60_000;
export const BLITZ_WRONG_PENALTY_MS = 3_000;
/** Answers in a row needed for double points. */
export const BLITZ_STREAK_FOR_BONUS = 5;

/** Points for a correct answer given the streak *including* this answer. */
export function blitzPoints(streak: number): number {
  return streak >= BLITZ_STREAK_FOR_BONUS ? 2 : 1;
}

/** Remaining time after `elapsedMs` and accumulated penalties, never negative. */
export function blitzRemainingMs(elapsedMs: number, penaltyMs: number): number {
  return Math.max(0, BLITZ_DURATION_MS - elapsedMs - penaltyMs);
}
