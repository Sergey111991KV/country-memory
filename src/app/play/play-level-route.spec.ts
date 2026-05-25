import { resolveLevelLaunchPlan } from './play-level-route';

describe('resolveLevelLaunchPlan', () => {
  it('routes facts-only levels to facts-drill', () => {
    const plan = resolveLevelLaunchPlan({
      id: 'facts-starter',
      order: 6,
      title: { en: 'Facts', ru: 'Факты' },
      subtitle: { en: 'Sub', ru: 'Sub' },
      countryIsos: [],
      topics: ['facts'],
      useFreeTierPool: true,
    });
    expect(plan.commands).toEqual(['/tabs/play/facts-drill']);
    expect(plan.meta.kind).toBe('facts_drill');
  });

  it('routes mixed facts levels with mixFlags', () => {
    const plan = resolveLevelLaunchPlan({
      id: 'level-4',
      order: 4,
      title: { en: 'Facts mix', ru: 'Факты' },
      subtitle: { en: 'Sub', ru: 'Sub' },
      countryIsos: ['RU'],
      topics: ['flags', 'capitals', 'facts'],
    });
    expect(plan.commands).toEqual(['/tabs/play/facts-drill']);
    expect(plan.meta.kind).toBe('facts_mixed');
    expect(plan.meta.mixFlags).toBeTrue();
  });

  it('routes capitals-only to capital challenge', () => {
    const plan = resolveLevelLaunchPlan({
      id: 'cap-only',
      order: 1,
      title: { en: 'Cap', ru: 'Cap' },
      subtitle: { en: 'Sub', ru: 'Sub' },
      countryIsos: ['FR'],
      topics: ['capitals'],
    });
    expect(plan.commands).toEqual(['/tabs/play/challenge', 'capital_pick_country']);
  });
});
