import { TestBed } from '@angular/core/testing';

import { DailyGoalService } from './daily-goal.service';
import { StorageService } from './storage.service';
import { UserLearningService } from './user-learning.service';

describe('DailyGoalService', () => {
  let service: DailyGoalService;
  let storage: jasmine.SpyObj<StorageService>;
  let learning: jasmine.SpyObj<UserLearningService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['get', 'set', 'remove']);
    learning = jasmine.createSpyObj<UserLearningService>('UserLearningService', [
      'hydrate',
      'countCorrectToday',
    ]);
    learning.hydrate.and.resolveTo();
    learning.countCorrectToday.and.returnValue(3);

    TestBed.configureTestingModule({
      providers: [
        DailyGoalService,
        { provide: StorageService, useValue: storage },
        { provide: UserLearningService, useValue: learning },
      ],
    });
    service = TestBed.inject(DailyGoalService);
    storage.get.and.resolveTo(null);
    storage.set.and.resolveTo();
  });

  it('should skip storage write when sync state is unchanged', async () => {
    const today = new Date().toISOString().slice(0, 10);
    storage.get.and.resolveTo({
      date: today,
      target: 5,
      progress: 3,
    });

    const state = await service.syncFromLearning();

    expect(state.progress).toBe(3);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should write storage when progress changes', async () => {
    const today = new Date().toISOString().slice(0, 10);
    storage.get.and.resolveTo({
      date: today,
      target: 5,
      progress: 1,
    });
    learning.countCorrectToday.and.returnValue(4);

    const state = await service.syncFromLearning();

    expect(state.progress).toBe(4);
    expect(storage.set).toHaveBeenCalledWith('flagfield_daily_goal_v1', {
      date: today,
      target: 5,
      progress: 4,
    });
  });
});
