import type { AppIconId } from '../icons/app-icons.registry';

/** Hero badge on the session results screen. */
export function sessionResultHeroIcon(input: {
  isPassPlay: boolean;
  isTie: boolean;
  soloPercent: number;
}): AppIconId {
  if (input.isPassPlay) {
    return input.isTie ? 'result-tie' : 'result-trophy';
  }
  if (input.soloPercent >= 80) {
    return 'result-star';
  }
  if (input.soloPercent >= 50) {
    return 'result-spark';
  }
  return 'result-target';
}

export function rankMedalIcon(rank: number): AppIconId | null {
  if (rank === 1) {
    return 'medal-gold';
  }
  if (rank === 2) {
    return 'medal-silver';
  }
  if (rank === 3) {
    return 'medal-bronze';
  }
  return null;
}
