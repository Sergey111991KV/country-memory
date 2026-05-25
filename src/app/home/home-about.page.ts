import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DailyGoalService } from '../core/services/daily-goal.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home-about',
  templateUrl: './home-about.page.html',
  styleUrls: ['./home-about.page.scss'],
  standalone: false,
})
export class HomeAboutPage implements OnInit {
  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly dailyGoal = inject(DailyGoalService);

  readonly freeGamesLimit = environment.freeGamesLimit;
  freeCountryCount = 30;
  dailyTarget = 5;

  ngOnInit(): void {
    void this.loadStats();
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  private async loadStats(): Promise<void> {
    const free = await this.playPool.getFreePool();
    this.freeCountryCount = free.length;
    const goal = await this.dailyGoal.getState();
    this.dailyTarget = goal.target;
  }
}
