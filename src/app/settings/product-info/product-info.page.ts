import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DailyGoalService } from '../../core/services/daily-goal.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { environment } from '../../../environments/environment';

export interface AboutOnboardingSlide {
  icon: string;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
}

@Component({
  selector: 'app-product-info',
  templateUrl: './product-info.page.html',
  styleUrls: ['./product-info.page.scss'],
  standalone: false,
})
export class ProductInfoPage implements OnInit {
  private readonly router = inject(Router);
  private readonly playPool = inject(PlayPoolService);
  private readonly dailyGoal = inject(DailyGoalService);

  readonly appVersion = environment.appVersion;
  readonly freeGamesLimit = environment.freeGamesLimit;

  activeSlideIndex = 0;
  freeCountryCount = 30;
  dailyTarget = 5;

  readonly slides: AboutOnboardingSlide[] = [
    {
      icon: 'earth-outline',
      titleKey: 'aboutProduct.slide1Title',
      bodyKey: 'aboutProduct.slide1Body',
    },
    {
      icon: 'game-controller-outline',
      titleKey: 'aboutProduct.slide2Title',
      bodyKey: 'aboutProduct.slide2Body',
    },
    {
      icon: 'flag-outline',
      titleKey: 'aboutProduct.slide3Title',
      bodyKey: 'aboutProduct.slide3Body',
    },
    {
      icon: 'library-outline',
      titleKey: 'aboutProduct.slide4Title',
      bodyKey: 'aboutProduct.slide4Body',
    },
    {
      icon: 'stats-chart-outline',
      titleKey: 'aboutProduct.slide5Title',
      bodyKey: 'aboutProduct.slide5Body',
    },
    {
      icon: 'person-circle-outline',
      titleKey: 'aboutProduct.slide6Title',
      bodyKey: 'aboutProduct.slide6Body',
    },
  ];

  ngOnInit(): void {
    void this.loadStats();
  }

  get slideCount(): number {
    return this.slides.length;
  }

  get isFirstSlide(): boolean {
    return this.activeSlideIndex === 0;
  }

  get isLastSlide(): boolean {
    return this.activeSlideIndex === this.slides.length - 1;
  }

  slideParams(slide: AboutOnboardingSlide): Record<string, string | number> {
    return {
      countries: this.freeCountryCount,
      sessions: this.freeGamesLimit,
      target: this.dailyTarget,
      ...slide.params,
    };
  }

  goBack(): void {
    void this.router.navigate(['/tabs/settings'], {
      queryParams: { panel: 'how-it-works' },
    });
  }

  prevSlide(): void {
    if (this.activeSlideIndex > 0) {
      this.activeSlideIndex -= 1;
    }
  }

  nextSlide(): void {
    if (this.isLastSlide) {
      this.goBack();
      return;
    }
    this.activeSlideIndex += 1;
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.activeSlideIndex = index;
    }
  }

  private async loadStats(): Promise<void> {
    const free = await this.playPool.getFreePool();
    this.freeCountryCount = free.length;
    const goal = await this.dailyGoal.getState();
    this.dailyTarget = goal.target;
  }
}
