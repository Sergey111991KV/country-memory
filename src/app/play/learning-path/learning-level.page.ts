import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import { LearningPathService } from '../../core/services/learning-path.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { playDebug } from '../../core/utils/play-debug';
import { resolveLevelLaunchPlan } from '../play-level-route';

@Component({
  selector: 'app-learning-level',
  templateUrl: './learning-level.page.html',
  standalone: false,
})
export class LearningLevelPage implements ViewDidEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly path = inject(LearningPathService);
  private readonly playSession = inject(PlaySessionService);
  readonly locale = inject(LocaleService);

  ionViewDidEnter(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('levelId');
    playDebug('LearningLevel', 'start', { levelId: id });
    if (!id) {
      void this.router.navigate(['/tabs/play/learn']);
      return;
    }
    await this.path.ensureLoaded();
    const level = this.path.getLevel(id);
    if (!level) {
      playDebug('LearningLevel', 'unknown level', { levelId: id });
      void this.router.navigate(['/tabs/play/learn']);
      return;
    }
    const pool = await this.path.resolveLevelPool(level);
    if (pool.length < 2) {
      playDebug('LearningLevel', 'pool too small', { levelId: id, count: pool.length });
      void this.router.navigate(['/tabs/play/learn']);
      return;
    }
    const plan = resolveLevelLaunchPlan(level);
    this.playSession.clear();
    this.playSession.setPool(pool);
    this.playSession.setMeta(plan.meta);
    playDebug('LearningLevel', 'navigate', plan);
    void this.router.navigate(plan.commands, { replaceUrl: true });
  }
}
