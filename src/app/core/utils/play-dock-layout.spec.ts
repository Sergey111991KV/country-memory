import {
  PLAY_DOCK_LAYOUT,
  playDockActiveCardTopPx,
  playDockActiveTopOverflowPx,
} from './play-dock-layout';

describe('playDockLayout', () => {
  it('keeps the centered active card inside the arc window', () => {
    expect(playDockActiveTopOverflowPx()).toBe(0);
    expect(playDockActiveCardTopPx()).toBeGreaterThanOrEqual(-PLAY_DOCK_LAYOUT.arcWindow);
  });
});
