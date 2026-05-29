import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';

import type { HeroTypography } from '../core/services/app-settings.service';
import { AppSettingsService } from '../core/services/app-settings.service';
import { DisplayTextService } from '../core/services/display-text.service';
import { DailyGoalService } from '../core/services/daily-goal.service';
import { LocaleService } from '../core/services/locale.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { PlaySessionService } from '../core/services/play-session.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { PerfLogService } from '../core/services/perf-log.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, ViewWillEnter {
  private readonly displayText = inject(DisplayTextService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly dailyGoal = inject(DailyGoalService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  readonly sub = inject(SubscriptionService);
  readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly perf = inject(PerfLogService);
  private readonly cdr = inject(ChangeDetectorRef);

  heroTitleDisplay = '';
  heroSubShortDisplay = '';
  heroTypography: HeroTypography = 'comfortable';
  dailyDone = 0;
  dailyTarget = 5;
  dailyComplete = false;
  dailyProgressPercent = 0;
  freeCountryCount = 30;

  ngOnInit(): void {
    void this.refresh();
  }

  ionViewWillEnter(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const span = this.perf.span('Home', 'refresh');
    await this.sub.init();
    await this.displayText.ensureLoaded();
    this.heroTitleDisplay = this.displayText.effective('home.heroTitle');
    this.heroSubShortDisplay = this.displayText.effective('home.heroSubShort');
    const settings = await this.appSettings.load();
    this.heroTypography = settings.heroTypography;
    const goal = await this.dailyGoal.syncFromLearning();
    this.dailyDone = goal.progress;
    this.dailyTarget = goal.target;
    this.dailyComplete = goal.progress >= goal.target;
    this.dailyProgressPercent =
      this.dailyTarget > 0
        ? Math.min(100, Math.round((this.dailyDone / this.dailyTarget) * 100))
        : 0;
    const free = await this.playPool.getFreePool();
    this.freeCountryCount = free.length;
    this.cdr.markForCheck();
    span.end({ dailyDone: this.dailyDone, freeCountries: this.freeCountryCount });
  }

  async play(): Promise<void> {
    const pool = await this.playPool.getFreePool();
    this.playSession.clear();
    this.playSession.setPool(pool);
    void this.router.navigate(['/tabs/play']);
  }

  openPaywall(): void {
    void this.router.navigate(['/paywall']);
  }
}
