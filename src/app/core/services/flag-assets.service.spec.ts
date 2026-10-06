import { FlagAssetsService } from './flag-assets.service';

describe('FlagAssetsService', () => {
  const svc = new FlagAssetsService();

  it('prefers bundled flags and falls back to the CDN', () => {
    expect(svc.heroUrl('FR')).toBe('assets/flags/fr.svg');
    expect(svc.sourceForAttempt('fr', 0)).toBe('assets/flags/fr.svg');
    expect(svc.sourceForAttempt('fr', 1)).toBe('https://flagcdn.com/w640/fr.png');
    expect(svc.sourceForAttempt('fr', 2, false)).toBe('https://flagcdn.com/w160/fr.png');
    expect(svc.sourceForAttempt('fr', 3)).toBe('');
  });

  it('rejects invalid codes', () => {
    expect(svc.localUrl('-99')).toBe('');
    expect(svc.remoteUrl('fra', 320)).toBe('');
  });
});
