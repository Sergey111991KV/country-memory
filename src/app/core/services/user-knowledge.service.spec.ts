import { TestBed } from '@angular/core/testing';

import { CountryKnowledgeService } from './country-knowledge.service';
import { StorageService } from './storage.service';
import { UserKnowledgeService } from './user-knowledge.service';
import { UserLearnedService } from './user-learned.service';
import { CountriesCatalogService } from './countries-catalog.service';

describe('UserKnowledgeService', () => {
  let service: UserKnowledgeService;
  let learned: UserLearnedService;
  let knowledge: CountryKnowledgeService;
  let storage: Record<string, unknown>;

  beforeEach(() => {
    storage = {};
    const storageMock = {
      get: (key: string) => Promise.resolve(storage[key]),
      set: (key: string, value: unknown) => {
        storage[key] = value;
        return Promise.resolve();
      },
    };
    TestBed.configureTestingModule({
      providers: [
        UserKnowledgeService,
        UserLearnedService,
        CountryKnowledgeService,
        CountriesCatalogService,
        { provide: StorageService, useValue: storageMock },
      ],
    });
    service = TestBed.inject(UserKnowledgeService);
    learned = TestBed.inject(UserLearnedService);
    knowledge = TestBed.inject(CountryKnowledgeService);
  });

  it('counts manually marked trivia and profile fields separately', async () => {
    await TestBed.inject(CountriesCatalogService).ensureLoaded();
    await knowledge.ensureLoaded();
    await learned.markFactLearned('FR-trivia-1');
    await learned.markFactLearned(knowledge.profileFieldMarkId('FR', 'capital'));
    const countries = TestBed.inject(CountriesCatalogService)
      .getAll()
      .filter((c) => c.iso2 === 'FR');
    const stats = await service.computeStats(countries, []);
    expect(stats.factsLearned).toBe(1);
    expect(stats.capitalsLearned).toBe(1);
  });

  it('reuses cached stats when marks revision is unchanged', async () => {
    await TestBed.inject(CountriesCatalogService).ensureLoaded();
    await knowledge.ensureLoaded();
    const countries = TestBed.inject(CountriesCatalogService).getAll().slice(0, 5);
    const first = await service.computeStats(countries, []);
    const second = await service.computeStats(countries, []);
    expect(second).toBe(first);
  });
});
