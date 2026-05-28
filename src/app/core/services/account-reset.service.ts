import { Injectable, inject } from '@angular/core';

import {
  AppSettingsService,
  type AppSettings,
} from './app-settings.service';
import { AppLogService } from './app-log.service';
import { DailyGoalService } from './daily-goal.service';
import { DisplayTextService } from './display-text.service';
import { LearningPathService } from './learning-path.service';
import { LocalAuthService } from './local-auth.service';
import { SessionAccessService } from './session-access.service';
import { StorageService } from './storage.service';
import { UserLearnedService } from './user-learned.service';
import { UserLearningService } from './user-learning.service';

/** Local progress keys cleared on account reset. Subscription state is not touched. */
export const PROGRESS_STORAGE_KEYS = [
  'flagfield_learned_marks_v1',
  'flagfield_completed_games_v1',
  'flagfield_learning_events_v1',
  'flagfield_mastery_v1',
  'flagfield_learning_path_v1',
  'flagfield_daily_goal_v1',
  'display_text_overrides_v1',
  'flagfield_local_auth_v1',
  'flagfield_auth_session_v1',
] as const;

@Injectable({ providedIn: 'root' })
export class AccountResetService {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(LocalAuthService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly userLearned = inject(UserLearnedService);
  private readonly userLearning = inject(UserLearningService);
  private readonly learningPath = inject(LearningPathService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly displayText = inject(DisplayTextService);
  private readonly appLog = inject(AppLogService);

  /** Wipes game progress and profile; keeps Premium / RevenueCat and display prefs. */
  async resetAccount(): Promise<void> {
    await this.appLog.log('account', 'Account reset started');

    await this.userLearned.flushPersist();
    await this.userLearning.flushPersist();
    await this.userLearned.reset();
    await this.userLearning.reset();

    for (const key of PROGRESS_STORAGE_KEYS) {
      await this.storage.remove(key);
    }

    const settings = await this.appSettings.load();
    const nextSettings: AppSettings = {
      ...settings,
      primaryPlayerName: 'Player',
    };
    await this.appSettings.save(nextSettings);

    await this.sessionAccess.reset();
    await this.learningPath.resetProgress();
    await this.dailyGoal.reset();
    await this.displayText.clearAll();
    await this.auth.clearProfile();

    await this.appLog.log('account', 'Account reset completed');
  }
}
