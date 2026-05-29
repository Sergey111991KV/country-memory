import { fakeAsync, flush, flushMicrotasks, TestBed, tick } from '@angular/core/testing';

import { StorageService } from './storage.service';
import { PerfLogService } from './perf-log.service';
import { UserLearningService } from './user-learning.service';

describe('UserLearningService', () => {
  let service: UserLearningService;
  let storage: jasmine.SpyObj<StorageService>;
  let perf: jasmine.SpyObj<PerfLogService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['get', 'set', 'remove']);
    storage.get.and.resolveTo(null);
    storage.set.and.resolveTo();
    perf = jasmine.createSpyObj<PerfLogService>('PerfLogService', ['span', 'mark']);
    perf.span.and.returnValue({ end: jasmine.createSpy('end') });

    TestBed.configureTestingModule({
      providers: [
        UserLearningService,
        { provide: StorageService, useValue: storage },
        { provide: PerfLogService, useValue: perf },
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

  it('should cache streak and best-day stats until a new attempt', async () => {
    await service.recordAttempt('quiz', 'US', true, false);
    await service.flushPersist();

    expect(service.getActivityStreak()).toBe(1);
    expect(service.getActivityStreak()).toBe(1);
    expect(service.getBestDayCorrect()).toBe(1);
    expect(service.getBestDayCorrect()).toBe(1);

    await service.recordAttempt('quiz', 'FR', true, false);
    expect(service.getBestDayCorrect()).toBe(2);
  });

  it('should expose a data revision that changes after attempts', async () => {
    const before = service.getDataRevision();
    await service.recordAttempt('quiz', 'US', true, false);
    expect(service.getDataRevision()).not.toBe(before);
  });
});
