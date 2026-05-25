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
          },
        },
      ],
    });
    service = TestBed.inject(SessionAccessService);
  });

  it('allows games under the free limit', async () => {
    await service.hydrate();
    expect(service.canStartGame(false)).toBeTrue();
  });

  it('blocks new games after the free limit', async () => {
    await service.hydrate();
    for (let i = 0; i < service.freeGamesLimit; i++) {
      await service.recordCompletedGame();
    }
    expect(service.canStartGame(false)).toBeFalse();
    expect(service.isAtFreeLimit(false)).toBeTrue();
  });

  it('always allows games for premium', async () => {
    await service.hydrate();
    for (let i = 0; i < service.freeGamesLimit + 5; i++) {
      await service.recordCompletedGame();
    }
    expect(service.canStartGame(true)).toBeTrue();
  });
});
