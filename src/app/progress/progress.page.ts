import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';

import type { AppLang } from '../core/i18n/messages';
import type { GameModeId } from '../core/data/country.types';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { KnowledgeManifestService } from '../core/services/knowledge-manifest.service';
import type { ManifestStatRow } from '../core/services/knowledge-manifest.service';
import { LearningPathService } from '../core/services/learning-path.service';
import { LocaleService } from '../core/services/locale.service';
import { UserKnowledgeService } from '../core/services/user-knowledge.service';
import { UserLearnedService } from '../core/services/user-learned.service';
import { UserLearningService } from '../core/services/user-learning.service';
import { PerfLogService } from '../core/services/perf-log.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressPage {
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly learning = inject(UserLearningService);
  private readonly learned = inject(UserLearnedService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly manifest = inject(KnowledgeManifestService);
  private readonly userKnowledge = inject(UserKnowledgeService);
  private readonly learningPath = inject(LearningPathService);
  private readonly perf = inject(PerfLogService);

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

  private lastRefreshKey: string | null = null;

  ionViewWillEnter(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const span = this.perf.span('Progress', 'refresh');
    await this.manifest.ensureLoaded();
    await this.catalog.ensureLoaded();
    await this.learning.hydrate();
    await this.learned.hydrate();
    await this.learningPath.ensureLoaded();
    const goal = await this.dailyGoal.syncFromLearning();
    const lang = this.locale.language;
    const refreshKey = this.buildRefreshKey(goal.progress, goal.target, lang);
    if (this.lastRefreshKey === refreshKey) {
      span.end({ skipped: true, reason: 'snapshot' });
      return;
    }
    this.lastRefreshKey = refreshKey;
    this.dailyDone = goal.progress;
    this.dailyTarget = goal.target;
    this.correctToday = this.learning.countCorrectToday();
    this.streakDays = this.learning.getActivityStreak();
    this.bestDayRecord = this.learning.getBestDayCorrect();
    const mastery = this.learning.getMasteryList();
    this.practicedCount = mastery.filter((m) => m.timesSeen > 0).length;
    const statsSpan = this.perf.span('Progress', 'computeStats');
    const stats = await this.userKnowledge.computeStats(
      this.catalog.getAll(),
      mastery,
    );
    statsSpan.end({
      countries: this.catalog.getAll().length,
      factsLearned: stats.factsLearned,
    });
    this.statRows = this.manifest.buildStatRows(stats);
    this.factsLearnedTotal = stats.factsLearned;
    this.factsTotal = stats.factsTotal;
    this.pathDots = this.buildPathDots();
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
    this.cdr.markForCheck();
    span.end({
      practiced: this.practicedCount,
      events: this.learning.getRecentEvents(100).length,
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

  trackStatRow(_index: number, row: ManifestStatRow): string {
    return row.labelKey;
  }

  trackPathDot(_index: number, dot: PathChapterDot): string {
    return dot.id;
  }

  trackRecent(index: number, row: { label: string; correct: boolean }): string {
    return `${index}:${row.label}:${row.correct}`;
  }

  private buildRefreshKey(dailyDone: number, dailyTarget: number, lang: AppLang): string {
    const pathKey = this.learningPath
      .getLevels()
      .map((def) => (this.learningPath.getProgress(def.id).completed ? '1' : '0'))
      .join('');
    return [
      dailyDone,
      dailyTarget,
      this.learning.getDataRevision(),
      this.learned.getMarksRevision(),
      lang,
      pathKey,
    ].join(':');
  }
}
