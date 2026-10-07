import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';
import { IonContent, ViewDidEnter, ViewWillEnter } from '@ionic/angular';
import { Router } from '@angular/router';

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
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { isBillingEnabled } from '../core/utils/billing-mode';
import { AchievementsService } from '../core/services/achievements.service';
import { ReviewLaunchService } from '../core/services/review-launch.service';
import type { AchievementView } from '../core/utils/achievements';
import { environment } from '../../environments/environment';

export interface WeakSpotRow {
  iso2: string;
  label: string;
  wrong: number;
  seen: number;
  confusedLabel: string;
  confusedIsos: string[];
}

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
export class ProgressPage implements ViewWillEnter, ViewDidEnter {
  @ViewChild('progressContent') private progressContent?: IonContent;
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  readonly sub = inject(SubscriptionService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly learning = inject(UserLearningService);
  private readonly learned = inject(UserLearnedService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly manifest = inject(KnowledgeManifestService);
  private readonly userKnowledge = inject(UserKnowledgeService);
  private readonly learningPath = inject(LearningPathService);
  private readonly perf = inject(PerfLogService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly router = inject(Router);
  private readonly achievementsSvc = inject(AchievementsService);
  private readonly reviewLaunch = inject(ReviewLaunchService);

  readonly billingEnabled = isBillingEnabled();
  readonly freeGamesLimit = environment.freeGamesLimit;

  practicedCount = 0;
  correctToday = 0;
  dailyDone = 0;
  dailyTarget = 5;
  dailyComplete = false;
  dailyProgressPercent = 0;
  freeGamesLeft = environment.freeGamesLimit;
  streakDays = 0;
  bestDayRecord = 0;
  factsLearnedTotal = 0;
  factsTotal = 0;
  statRows: ManifestStatRow[] = [];
  pathDots: PathChapterDot[] = [];
  recent: { label: string; modeLabel: string; correct: boolean }[] = [];
  weakSpots: WeakSpotRow[] = [];
  achievements: AchievementView[] = [];
  achievementsUnlocked = 0;
  showAllAchievements = false;

  private lastRefreshKey: string | null = null;

  ionViewWillEnter(): void {
    void this.refresh();
  }

  ionViewDidEnter(): void {
    void this.progressContent?.scrollToTop(0);
  }

  async refresh(): Promise<void> {
    const span = this.perf.span('Progress', 'refresh');
    if (this.billingEnabled) {
      await this.sub.init();
    }
    await this.sessionAccess.hydrate();
    await this.manifest.ensureLoaded();
    await this.catalog.ensureLoaded();
    await this.learning.hydrate();
    await this.learned.hydrate();
    await this.learningPath.ensureLoaded();
    const goal = await this.dailyGoal.syncFromLearning();
    const lang = this.locale.language;
    await this.refreshLearningInsights(lang);
    const refreshKey = this.buildRefreshKey(goal.progress, goal.target, lang);
    if (this.lastRefreshKey === refreshKey) {
      span.end({ skipped: true, reason: 'snapshot' });
      return;
    }
    this.lastRefreshKey = refreshKey;
    this.dailyDone = goal.progress;
    this.dailyTarget = goal.target;
    this.dailyComplete = goal.progress >= goal.target;
    this.dailyProgressPercent =
      this.dailyTarget > 0
        ? Math.min(100, Math.round((this.dailyDone / this.dailyTarget) * 100))
        : 0;
    this.freeGamesLeft = this.sessionAccess.remainingFreeGames(
      !this.billingEnabled || this.sub.isSubscribed(),
    );
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

  /** Weak spots + achievements (cheap; refreshed on every visit). */
  private async refreshLearningInsights(lang: AppLang): Promise<void> {
    const nameOf = (iso: string): string => {
      const c = this.catalog.getByIso(iso);
      return c ? this.catalog.localizedName(c, lang) : iso;
    };
    this.weakSpots = this.learning.getWeakSpots(8).map((w) => ({
      iso2: w.iso2,
      label: nameOf(w.iso2),
      wrong: w.wrong,
      seen: w.seen,
      confusedIsos: w.confusedWith,
      confusedLabel: w.confusedWith.map(nameOf).join(', '),
    }));
    this.achievements = await this.achievementsSvc.list();
    this.achievementsUnlocked = this.achievements.filter((a) => a.unlocked).length;
    this.cdr.markForCheck();
  }

  get visibleAchievements(): AchievementView[] {
    return this.showAllAchievements ? this.achievements : this.achievements.slice(0, 6);
  }

  toggleAchievements(): void {
    this.showAllAchievements = !this.showAllAchievements;
    this.cdr.markForCheck();
  }

  practiceWeakSpots(): void {
    const isos = this.weakSpots.map((w) => w.iso2);
    const confused = ([] as string[]).concat(...this.weakSpots.map((w) => w.confusedIsos));
    void this.reviewLaunch.practice(isos, confused);
  }

  practiceOne(row: WeakSpotRow): void {
    void this.reviewLaunch.practice([row.iso2], row.confusedIsos);
  }

  openProgressMap(): void {
    void this.router.navigate(['/tabs/play/explore-atlas'], {
      queryParams: { view: 'progress' },
    });
  }

  trackWeak(_index: number, row: WeakSpotRow): string {
    return row.iso2;
  }

  trackAchievement(_index: number, a: AchievementView): string {
    return a.id;
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

  openPaywall(): void {
    void this.router.navigate(['/paywall']);
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
