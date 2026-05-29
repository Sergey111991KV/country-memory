/** One physical card on the infinite wheel (several slots share the same logical item). */
export interface PlayDockWheelSlot {
  slotIndex: number;
  logicalIndex: number;
  copy: number;
  angle: number;
}

export function normalizeAngleDeg(deg: number): number {
  let angle = deg % 360;
  if (angle > 180) {
    angle -= 360;
  }
  if (angle < -180) {
    angle += 360;
  }
  return angle;
}

export function playDockSlotStepDeg(slotCount: number): number {
  return slotCount > 0 ? 360 / slotCount : 0;
}

/** Default wheel clones (2 = half the DOM nodes vs 3, still infinite scroll). */
export const PLAY_DOCK_WHEEL_COPIES = 2;

/** Build cloned slots around 360° (top = −90°). */
export function buildPlayDockWheelSlots(
  tileCount: number,
  copies = PLAY_DOCK_WHEEL_COPIES,
): PlayDockWheelSlot[] {
  if (tileCount <= 0) {
    return [];
  }
  const total = tileCount * copies;
  const step = playDockSlotStepDeg(total);
  const middleCopy = Math.floor(copies / 2);

  return Array.from({ length: total }, (_, slotIndex) => {
    const logicalIndex = slotIndex % tileCount;
    const copy = Math.floor(slotIndex / tileCount) - middleCopy;
    return {
      slotIndex,
      logicalIndex,
      copy,
      angle: -90 + slotIndex * step,
    };
  });
}

export function playDockMiddleSlotRange(
  count: number,
  copies = PLAY_DOCK_WHEEL_COPIES,
): { start: number; end: number } {
  const middleCopy = Math.floor(copies / 2);
  const start = count * middleCopy;
  return { start, end: start + count - 1 };
}

export function playDockMiddleSlotIndex(
  logicalIndex: number,
  tileCount: number,
  copies = PLAY_DOCK_WHEEL_COPIES,
): number {
  return playDockMiddleSlotRange(tileCount, copies).start + logicalIndex;
}

export function nearestPlayDockSlotIndex(
  slots: readonly PlayDockWheelSlot[],
  wheelDeg: number,
  tileCount: number,
): number {
  const { start, end } = playDockMiddleSlotRange(tileCount);
  let bestIndex = start;
  let bestDistance = Number.POSITIVE_INFINITY;

  slots.forEach((slot, index) => {
    const distance = Math.abs(normalizeAngleDeg(slot.angle + wheelDeg));
    if (distance < bestDistance - 0.001) {
      bestDistance = distance;
      bestIndex = index;
      return;
    }
    if (Math.abs(distance - bestDistance) <= 0.001) {
      const indexInMiddle = index >= start && index <= end;
      const bestInMiddle = bestIndex >= start && bestIndex <= end;
      if (indexInMiddle && !bestInMiddle) {
        bestIndex = index;
      }
    }
  });
  return bestIndex;
}

export function snapPlayDockSlotIndex(
  slots: readonly PlayDockWheelSlot[],
  wheelDeg: number,
  dragDelta: number,
  tileCount: number,
  copies = PLAY_DOCK_WHEEL_COPIES,
): number {
  if (slots.length === 0) {
    return 0;
  }
  const step = playDockSlotStepDeg(slots.length);
  const raw = (90 - wheelDeg) / step;

  let slotIdx = Math.round(raw);
  if (Math.abs(dragDelta) > step * 0.22) {
    slotIdx = dragDelta > 0 ? Math.ceil(raw - 0.18) : Math.floor(raw + 0.18);
  }

  slotIdx = ((slotIdx % slots.length) + slots.length) % slots.length;
  const logical = slotIdx % tileCount;
  return playDockMiddleSlotIndex(logical, tileCount, copies);
}

export function canonicalPlayDockWheelDeg(
  slots: readonly PlayDockWheelSlot[],
  slotIndex: number,
): number {
  return -(slots[slotIndex]?.angle ?? 0);
}

export function playDockLoopPeriodDeg(
  slotCount: number,
  tileCount: number,
): number {
  if (slotCount <= 0 || tileCount <= 0) {
    return 0;
  }
  return playDockSlotStepDeg(slotCount) * tileCount;
}

/** Snap wheel with the shortest spin (infinite forward/backward drag). */
export function resolvePlayDockSnapWheel(
  slots: readonly PlayDockWheelSlot[],
  slotIndex: number,
  currentWheelDeg: number,
  tileCount: number,
): number {
  const target = canonicalPlayDockWheelDeg(slots, slotIndex);
  const period = playDockLoopPeriodDeg(slots.length, tileCount);
  if (period <= 0) {
    return target;
  }

  let best = target;
  let bestDistance = Math.abs(currentWheelDeg - target);
  for (let k = -5; k <= 5; k++) {
    if (k === 0) {
      continue;
    }
    const candidate = target + k * period;
    const distance = Math.abs(currentWheelDeg - candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

export function playDockFocusFromAngle(angleDeg: number, focusSpanDeg = 20): number {
  const distance = Math.min(focusSpanDeg, Math.abs(normalizeAngleDeg(angleDeg)));
  return Math.max(0, 1 - distance / focusSpanDeg);
}
