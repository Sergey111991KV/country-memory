import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';

import type { HomeFeedCard } from '../core/services/home-feed.service';
import { HomeFeedService } from '../core/services/home-feed.service';
import { LocaleService } from '../core/services/locale.service';
import { PlayPoolService } from '../core/services/play-pool.service';
import { PlaySessionService } from '../core/services/play-session.service';
import { PerfLogService } from '../core/services/perf-log.service';

const ROTATE_MS = 10_000;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, ViewWillEnter {
  private readonly destroyRef = inject(DestroyRef);
  private readonly feed = inject(HomeFeedService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly router = inject(Router);
  private readonly perf = inject(PerfLogService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly locale = inject(LocaleService);

  card: HomeFeedCard | null = null;
  cardPhase: 'idle' | 'fade' = 'idle';
  private rotateTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.refresh();
    this.rotateTimer = setInterval(() => this.rotateCard(), ROTATE_MS);
    this.destroyRef.onDestroy(() => {
      if (this.rotateTimer !== null) {
        clearInterval(this.rotateTimer);
      }
    });
  }

  ionViewWillEnter(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const span = this.perf.span('Home', 'refresh');
    await this.feed.ensureDeck();
    this.card = this.feed.currentCard();
    this.cdr.markForCheck();
    span.end({ card: this.card?.id ?? null });
  }

  rotateCard(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.card = this.feed.advance();
      this.cdr.markForCheck();
      return;
    }
    this.cardPhase = 'fade';
    this.cdr.markForCheck();
    window.setTimeout(() => {
      this.card = this.feed.advance();
      this.cardPhase = 'idle';
      this.cdr.markForCheck();
    }, 220);
  }

  async playCountry(): Promise<void> {
    if (!this.card) {
      void this.router.navigate(['/tabs/play']);
      return;
    }
    const pool = await this.playPool.getFilteredFreePool();
    const iso = this.card.iso;
    const match = pool.find((c) => c.iso2.toUpperCase() === iso);
    const sessionPool = match ? [match, ...pool.filter((c) => c.iso2.toUpperCase() !== iso).slice(0, 3)] : pool.slice(0, 4);
    if (sessionPool.length < 2) {
      void this.router.navigate(['/tabs/play']);
      return;
    }
    this.playSession.clear();
    this.playSession.setPool(sessionPool);
    this.playSession.setMeta({ kind: 'default' });
    void this.router.navigate(['/tabs/play/challenge', 'flag_pick_country']);
  }

  openKnowledge(): void {
    void this.router.navigate(['/tabs/knowledge']);
  }

  openPlay(): void {
    void this.router.navigate(['/tabs/play']);
  }
}
