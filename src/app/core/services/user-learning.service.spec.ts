import { fakeAsync, flush, flushMicrotasks, TestBed, tick } from '@angular/core/testing';

import { StorageService } from './storage.service';
import { UserLearningService } from './user-learning.service';

describe('UserLearningService', () => {
  let service: UserLearningService;
  let storage: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['get', 'set', 'remove']);
    storage.get.and.resolveTo(null);
    storage.set.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        UserLearningService,
        { provide: StorageService, useValue: storage },
      ],
    });
    service = TestBed.inject(UserLearningService);
  });

  it('should debounce persist across rapid recordAttempt calls', fakeAsync(() => {
    void service.recordAttempt('quiz', 'US', true, false);
    void service.recordAttempt('quiz', 'FR', true, false);
    void service.recordAttempt('quiz', 'DE', false, false);
    flushMicrotasks();

    expect(storage.set).not.toHaveBeenCalled();

    tick(400);
    flush();

    expect(storage.set).toHaveBeenCalledTimes(2);
  }));

  it('should flush persist immediately when requested', fakeAsync(async () => {
    await service.recordAttempt('quiz', 'US', true, false);
    expect(storage.set).not.toHaveBeenCalled();

    await service.flushPersist();

    expect(storage.set).toHaveBeenCalledTimes(2);
  }));

  it('should cache countCorrectToday until a new attempt', async () => {
    await service.recordAttempt('quiz', 'US', true, false);
    await service.flushPersist();

    expect(service.countCorrectToday()).toBe(1);
    expect(service.countCorrectToday()).toBe(1);

    await service.recordAttempt('quiz', 'FR', true, false);
    expect(service.countCorrectToday()).toBe(2);
  });
});
