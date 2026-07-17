import { TestBed } from '@angular/core/testing';

import { CountriesCatalogService } from './countries-catalog.service';
import { CourseLaunchService } from './course-launch.service';
import { PlayPoolService } from './play-pool.service';
import { FIXTURE_COUNTRIES } from '../../play/testing/play-test-fixtures';

describe('CourseLaunchService', () => {
  let service: CourseLaunchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CourseLaunchService,
        {
          provide: CountriesCatalogService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getAll: () => FIXTURE_COUNTRIES,
          },
        },
        {
          provide: PlayPoolService,
          useValue: {
            getFreePool: () =>
              Promise.resolve(FIXTURE_COUNTRIES.filter((c) => c.iso2 === 'ES')),
            poolForTier: () => Promise.resolve(FIXTURE_COUNTRIES),
          },
        },
      ],
    });
    service = TestBed.inject(CourseLaunchService);
  });

  it('defines 7 course quick launches (5 continents + capitals)', () => {
    expect(service.launches.length).toBe(7);
  });

  it('resolves every continent launch pool from catalog', async () => {
    const africa = await service.resolvePool('continent-africa');
    expect(africa.map((c) => c.iso2)).toEqual(['NG']);

    const asia = await service.resolvePool('continent-asia');
    expect(asia.map((c) => c.iso2)).toEqual(['CN']);

    const europe = await service.resolvePool('continent-europe');
    expect(europe.map((c) => c.iso2).sort()).toEqual(['DE', 'ES', 'FR']);

    // Fixture has no oceania/americas countries — empty pools are valid.
    expect(await service.resolvePool('continent-oceania')).toEqual([]);
    expect(await service.resolvePool('continent-americas')).toEqual([]);
  });

  it('resolves capitals-free from free pool', async () => {
    const pool = await service.resolvePool('capitals-free');
    expect(pool.length).toBe(1);
    expect(pool[0]?.iso2).toBe('ES');
  });

  it('resolves capitals-world from tier pool', async () => {
    const pool = await service.resolvePool('capitals-world');
    expect(pool.length).toBe(FIXTURE_COUNTRIES.length);
  });

  it('maps each challenge launch to a challenge mode', () => {
    const challenge = service.launches.filter((l) => l.kind === 'challenge');
    expect(challenge.length).toBe(7);
    for (const launch of challenge) {
      expect(launch.challengeMode).toBeDefined();
    }
  });

  it('marks europe and asia as mixed continent drills', () => {
    const europe = service.getLaunch('continent-europe');
    const asia = service.getLaunch('continent-asia');
    expect(europe?.drillStyle).toBe('mixed');
    expect(asia?.drillStyle).toBe('mixed');
  });
});
