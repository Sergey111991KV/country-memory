import {
  rankMedalIcon,
  sessionResultHeroIcon,
} from './app-icon-ui';

describe('app-icon-ui', () => {
  it('picks trophy for pass play winner', () => {
    expect(
      sessionResultHeroIcon({ isPassPlay: true, isTie: false, soloPercent: 0 }),
    ).toBe('result-trophy');
  });

  it('picks tie icon for pass play draw', () => {
    expect(
      sessionResultHeroIcon({ isPassPlay: true, isTie: true, soloPercent: 0 }),
    ).toBe('result-tie');
  });

  it('maps solo percent to result icons', () => {
    expect(
      sessionResultHeroIcon({ isPassPlay: false, isTie: false, soloPercent: 85 }),
    ).toBe('result-star');
    expect(
      sessionResultHeroIcon({ isPassPlay: false, isTie: false, soloPercent: 60 }),
    ).toBe('result-spark');
    expect(
      sessionResultHeroIcon({ isPassPlay: false, isTie: false, soloPercent: 20 }),
    ).toBe('result-target');
  });

  it('maps podium ranks to medal icons', () => {
    expect(rankMedalIcon(1)).toBe('medal-gold');
    expect(rankMedalIcon(2)).toBe('medal-silver');
    expect(rankMedalIcon(3)).toBe('medal-bronze');
    expect(rankMedalIcon(4)).toBeNull();
  });
});
