import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';
import { SessionAccessService } from './session-access.service';

describe('SessionAccessService', () => {
  let service: SessionAccessService;
  let storage: Record<string, unknown>;

  beforeEach(() => {
    storage = {};
    TestBed.configureTestingModule({
      providers: [
        SessionAccessService,
        {
          provide: StorageService,
          useValue: {
            get: (key: string) => Promise.resolve(storage[key]),
            set: (key: string, value: unknown) => {
              storage[key] = value;
              return Promise.resolve();
            },
            remove: (key: string) => {
              delete storage[key];
              return Promise.resolve();
            },
          },
        },
      ],
    });
    service = TestBed.inject(SessionAccessService);
  });

  it('always allows games when billing is disabled', async () => {
    await service.hydrate();
    for (let i = 0; i < service.freeGamesLimit + 5; i++) {
      await service.recordCompletedGame();
    }
    expect(service.canStartGame(false)).toBeTrue();
    expect(service.isAtFreeLimit(false)).toBeFalse();
  });

  it('tracks completed games', async () => {
    await service.hydrate();
    await service.recordCompletedGame();
    await service.recordCompletedGame();
    expect(service.completedGamesSig()).toBe(2);
  });
});
