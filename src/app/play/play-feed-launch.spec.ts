import { resolveFeedCardLaunch } from './play-feed-launch';

describe('resolveFeedCardLaunch', () => {
  it('routes flag cards to flag challenge', () => {
    expect(resolveFeedCardLaunch('flag')).toEqual({
      commands: ['/tabs/play/challenge', 'flag_pick_country'],
      meta: { kind: 'default' },
    });
  });

  it('routes capital cards to capital challenge', () => {
    expect(resolveFeedCardLaunch('capital')).toEqual({
      commands: ['/tabs/play/challenge', 'capital_pick_country'],
      meta: { kind: 'default' },
    });
  });

  it('routes currency cards to facts drill with pinned kind', () => {
    expect(resolveFeedCardLaunch('currency')).toEqual({
      commands: ['/tabs/play/facts-drill'],
      meta: { kind: 'facts_drill', factsDrillKind: 'currency' },
    });
  });

  it('routes language cards to facts drill with pinned kind', () => {
    expect(resolveFeedCardLaunch('language')).toEqual({
      commands: ['/tabs/play/facts-drill'],
      meta: { kind: 'facts_drill', factsDrillKind: 'language' },
    });
  });

  it('routes fact cards to facts quiz', () => {
    expect(resolveFeedCardLaunch('fact')).toEqual({
      commands: ['/tabs/play/facts-quiz'],
      meta: { kind: 'default' },
    });
  });
});
