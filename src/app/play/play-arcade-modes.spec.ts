import { DAILY_COUNTRY_SLIDE, buildArcadeModes } from './play-mode-catalog';
import { resolvePlayModeLaunch } from './play-mode-launch';

describe('arcade modes', () => {
  it('routes every arcade game for subscribers', () => {
    const expected: Record<string, (string | Record<string, string>)[]> = {
      globe_hotcold: ['/tabs/play/globe-find', { variant: 'hotcold' }],
      blitz_flags: ['/tabs/play/blitz', 'flags'],
      blitz_capitals: ['/tabs/play/blitz', 'capitals'],
      silhouette: ['/tabs/play/silhouette'],
      globe_neighbors: ['/tabs/play/globe-find', { variant: 'neighbors' }],
      globe_identify: ['/tabs/play/globe-find', { variant: 'identify' }],
    };
    const modes = buildArcadeModes(true);
    expect(modes.map((m) => m.id)).toEqual(Object.keys(expected));
    for (const slide of modes) {
      const launch = resolvePlayModeLaunch(slide.action, { isSubscribed: true });
      expect(launch.kind).withContext(slide.id).toBe('route');
      if (launch.kind === 'route') {
        expect(launch.commands).withContext(slide.id).toEqual(expected[slide.id]!);
      }
    }
  });

  it('keeps globe games Premium but blitz / silhouette free', () => {
    for (const slide of buildArcadeModes(false)) {
      const launch = resolvePlayModeLaunch(slide.action, { isSubscribed: false });
      const premium = slide.action.type === 'globe';
      expect(launch.kind).withContext(slide.id).toBe(premium ? 'paywall' : 'route');
      expect(slide.id.endsWith('_locked')).withContext(slide.id).toBe(premium);
    }
  });

  it('lets everyone play the daily country', () => {
    const launch = resolvePlayModeLaunch(DAILY_COUNTRY_SLIDE.action, { isSubscribed: false });
    expect(launch.kind).toBe('route');
    if (launch.kind === 'route') {
      expect(launch.commands).toEqual(['/tabs/play/globe-find', { variant: 'daily' }]);
      expect(launch.premiumOnly).toBeFalse();
    }
  });
});
