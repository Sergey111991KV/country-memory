import { Component, inject } from '@angular/core';

import type { GameModeId } from '../core/data/country.types';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { KnowledgeManifestService } from '../core/services/knowledge-manifest.service';
import type { ManifestStatRow } from '../core/services/knowledge-manifest.service';
import { LearningPathService } from '../core/services/learning-path.service';
import { LocaleService } from '../core/services/locale.service';
import { UserKnowledgeService } from '../core/services/user-knowledge.service';
import { UserLearningService } from '../core/services/user-learning.service';

export interface PathChapterDot {
  id: string;
  label: string;
  active: boolean;
  completed: boolean;
}

@Component({
  selector: 'app-progress',
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
  standalone: false,
})
export class ProgressPage {
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly learning = inject(UserLearningService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly manifest = inject(KnowledgeManifestService);
  private readonly userKnowledge = inject(UserKnowledgeService);
  private readonly learningPath = inject(LearningPathService);

  practicedCount = 0;
  correctToday = 0;
  dailyDone = 0;
  dailyTarget = 5;
  streakDays = 0;
  bestDayRecord = 0;
  factsLearnedTotal = 0;
  factsTotal = 0;
  statRows: ManifestStatRow[] = [];
  pathDots: PathChapterDot[] = [];
  recent: { label: string; modeLabel: string; correct: boolean }[] = [];

  ionViewWillEnter(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    await this.manifest.ensureLoaded();
    await this.catalog.ensureLoaded();
    await this.learning.hydrate();
    await this.learningPath.ensureLoaded();
    const goal = await this.dailyGoal.syncFromLearning();
    this.dailyDone = goal.progress;
    this.dailyTarget = goal.target;
    this.correctToday = this.learning.countCorrectToday();
    this.streakDays = this.learning.getActivityStreak();
    this.bestDayRecord = this.learning.getBestDayCorrect();
    const mastery = this.learning.getMasteryList();
    this.practicedCount = mastery.filter((m) => m.timesSeen > 0).length;
    const stats = await this.userKnowledge.computeStats(
      this.catalog.getAll(),
      mastery,
    );
    this.statRows = this.manifest.buildStatRows(stats);
    this.factsLearnedTotal = stats.factsLearned;
    this.factsTotal = stats.factsTotal;
    this.pathDots = this.buildPathDots();
    const lang = this.locale.language;
    this.recent = this.learning.getRecentEvents(12).map((e) => {
      const c = this.catalog.getByIso(e.countryId);
      const label = c
        ? this.catalog.localizedName(c, lang)
        : e.countryId;
      return {
        label,
        modeLabel: this.modeLabel(e.mode),
        correct: e.correct,
      };
    });
  }

  private buildPathDots(): PathChapterDot[] {
    const levels = this.learningPath.getLevels();
    return levels.map((def, index) => {
      const p = this.learningPath.getProgress(def.id);
      const title = def.title[this.locale.language] ?? def.title.en;
      return {
        id: def.id,
        label: title,
        active: this.learningPath.isLevelUnlocked(def, index) && !p.completed,
        completed: p.completed,
      };
    });
  }

  private modeLabel(mode: GameModeId): string {
    return this.locale.translate(`progress.mode.${mode}`);
  }
}
