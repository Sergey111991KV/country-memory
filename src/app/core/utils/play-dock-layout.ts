/** Shared Play dock wheel geometry (keep in sync with play.page.scss). */
export const PLAY_DOCK_LAYOUT = {
  arcRadius: 168,
  arcSink: 152,
  arcWindow: 192,
  inactiveCard: 100,
  activeCard: 142,
  activeGlow: 3,
} as const;

/** Top edge of the centered active card (px above arc bottom; negative = inside window). */
export function playDockActiveCardTopPx(
  layout: typeof PLAY_DOCK_LAYOUT = PLAY_DOCK_LAYOUT,
): number {
  const cardBottom = layout.arcSink - layout.arcRadius;
  return cardBottom - layout.activeCard - layout.activeGlow;
}

/** How many px the active card extends above the arc clip window (0 = fully contained). */
export function playDockActiveTopOverflowPx(
  layout: typeof PLAY_DOCK_LAYOUT = PLAY_DOCK_LAYOUT,
): number {
  return Math.max(0, -playDockActiveCardTopPx(layout) - layout.arcWindow);
}
