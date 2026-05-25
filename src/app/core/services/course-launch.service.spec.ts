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

  it('defines 9 course quick launches (5 continents + capitals + facts)', () => {
    expect(service.launches.length).toBe(9);
  });

  it('resolves continent-africa pool from catalog', async () => {
    const pool = await service.resolvePool('continent-africa');
    expect(pool.length).toBe(1);
    expect(pool[0]?.iso2).toBe('NG');
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

  it('maps facts launches to facts_drill kind', () => {
    const facts = service.launches.filter((l) => l.id.startsWith('facts-'));
    expect(facts.length).toBe(2);
    expect(facts.every((l) => l.kind === 'facts_drill')).toBeTrue();
  });

  it('marks europe and asia as mixed continent drills', () => {
    const europe = service.getLaunch('continent-europe');
    const asia = service.getLaunch('continent-asia');
    expect(europe?.drillStyle).toBe('mixed');
    expect(asia?.drillStyle).toBe('mixed');
  });
});
