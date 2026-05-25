import { withoutLegacyMemoryKeys } from './i18n-bundle';

describe('withoutLegacyMemoryKeys', () => {
  it('removes memory.* keys and keeps Flagfield keys', () => {
    const input = {
      'memory.title': 'Pairloom',
      'home.title': 'Flagfield',
      'common.ok': 'OK',
    };
    expect(withoutLegacyMemoryKeys(input)).toEqual({
      'home.title': 'Flagfield',
      'common.ok': 'OK',
    });
  });
});
