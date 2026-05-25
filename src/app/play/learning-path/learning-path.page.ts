import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';

import type { LearningLevelDef } from '../../core/services/learning-path.service';
import { LearningPathService } from '../../core/services/learning-path.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
export interface LevelRow {
  def: LearningLevelDef;
  unlocked: boolean;
  completed: boolean;
  progress: number;
  target: number;
}

@Component({
  selector: 'app-learning-path',
  templateUrl: './learning-path.page.html',
  styleUrls: ['./learning-path.page.scss'],
  standalone: false,
})
export class LearningPathPage implements ViewWillEnter {
  private readonly path = inject(LearningPathService);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly catalog = inject(CountriesCatalogService);

  rows: LevelRow[] = [];
  loading = true;

  ionViewWillEnter(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    await this.path.ensureLoaded();
    const levels = this.path.getLevels();
    this.rows = levels.map((def, index) => {
      const p = this.path.getProgress(def.id);
      return {
        def,
        unlocked: this.path.isLevelUnlocked(def, index),
        completed: p.completed,
        progress: p.correctAnswers,
        target: p.targetAnswers,
      };
    });
    this.loading = false;
  }

  title(def: LearningLevelDef): string {
    return def.title[this.locale.language] ?? def.title.en;
  }

  subtitle(def: LearningLevelDef): string {
    return def.subtitle[this.locale.language] ?? def.subtitle.en;
  }

  async openLevel(row: LevelRow): Promise<void> {
    if (!row.unlocked) {
      return;
    }
    await this.catalog.ensureLoaded();
    const pool = await this.path.resolveLevelPool(row.def);
    this.playSession.setPool(pool);
    void this.router.navigate(['/tabs/play/learn', row.def.id]);
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }
}
