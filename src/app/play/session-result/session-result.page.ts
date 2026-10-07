import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ViewDidEnter } from '@ionic/angular';

import type { PlaySessionResultPayload } from '../../core/data/play-session-result.types';
import type { AppIconId } from '../../core/icons/app-icons.registry';
import {
  rankMedalIcon,
  sessionResultHeroIcon,
} from '../../core/icons/app-icon-ui';
import { DonatePromptService } from '../../core/services/donate-prompt.service';
import { LocaleService } from '../../core/services/locale.service';
import { PlaySessionResultService } from '../../core/services/play-session-result.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { ReviewLaunchService } from '../../core/services/review-launch.service';
import { createPassPlaySession } from '../../core/services/pass-play-session';
import { playDebug } from '../../core/utils/play-debug';

@Component({
  selector: 'app-session-result',
  templateUrl: './session-result.page.html',
  styleUrls: ['./session-result.page.scss'],
  standalone: false,
})
export class SessionResultPage implements ViewDidEnter {
  readonly locale = inject(LocaleService);

  private readonly router = inject(Router);
  private readonly results = inject(PlaySessionResultService);
  private readonly playSession = inject(PlaySessionService);
  private readonly donatePrompt = inject(DonatePromptService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly reviewLaunch = inject(ReviewLaunchService);

  result: PlaySessionResultPayload | null = null;
  showDonatePrompt = false;
  /** Countries missed this session — offered as a short review round. */
  missedIsos: string[] = [];

  ionViewDidEnter(): void {
    this.result = this.results.consume();
    if (!this.result) {
      playDebug('SessionResult', 'no payload — redirect play hub');
      void this.router.navigate(['/tabs/play'], { replaceUrl: true });
      return;
    }
    this.missedIsos = this.isPassPlay ? [] : this.reviewLaunch.missedThisSession();
    void this.checkDonatePrompt();
  }

  reviewMistakes(): void {
    void this.reviewLaunch.practice(this.missedIsos);
  }

  private async checkDonatePrompt(): Promise<void> {
    const show = await this.donatePrompt.claimPrompt();
    if (this.showDonatePrompt === show) {
      return;
    }
    this.showDonatePrompt = show;
    this.cdr.detectChanges();
  }

  get isPassPlay(): boolean {
    return this.result?.variant === 'pass_play';
  }

  get isMapMark(): boolean {
    return this.result?.variant === 'map_mark';
  }

  get soloPercent(): number {
    if (!this.result) {
      return 0;
    }
    return (
      this.result.percent ??
      (this.result.total > 0
        ? Math.round((this.result.correct / this.result.total) * 100)
        : 0)
    );
  }

  get winnerName(): string {
    const row = this.result?.players?.find((p) => p.isWinner);
    return row?.name ?? '';
  }

  get canPlayAgain(): boolean {
    return (
      !!this.result?.passPlayMode &&
      !!this.result.passPlayPlayers?.length
    );
  }

  get heroIcon(): AppIconId {
    const r = this.result;
    if (!r) {
      return 'result-target';
    }
    return sessionResultHeroIcon({
      isPassPlay: this.isPassPlay,
      isTie: !!r.isTie,
      soloPercent: this.soloPercent,
    });
  }

  rankMedalIcon(rank: number): AppIconId | null {
    return rankMedalIcon(rank);
  }

  titleText(): string {
    if (!this.result) {
      return '';
    }
    if (this.isPassPlay && !this.result.isTie && this.winnerName) {
      return this.locale.translate('sessionResult.winner', {
        name: this.winnerName,
      });
    }
    return this.locale.translate(this.result.titleKey);
  }

  subtitleText(): string {
    if (!this.result?.subtitleKey) {
      return '';
    }
    return this.locale.translate(
      this.result.subtitleKey,
      this.result.subtitleParams,
    );
  }

  extraStatsText(): string {
    if (!this.result?.extraStatsKey) {
      return '';
    }
    return this.locale.translate(
      this.result.extraStatsKey,
      this.result.extraStatsParams,
    );
  }

  rankMedal(rank: number): string {
    return rank > 3 ? `${rank}` : '';
  }

  goBack(): void {
    this.playSession.clear();
    void this.router.navigate(['/tabs/play'], { replaceUrl: true });
  }

  playAgain(): void {
    const result = this.result;
    if (!result?.passPlayMode || !result.passPlayPlayers?.length) {
      return;
    }
    const session = createPassPlaySession(
      result.passPlayPlayers,
      result.passPlayMode,
      5,
      result.passPlayScoringStyle ?? 'turns',
    );
    this.playSession.setPassPlay(session);
    playDebug('SessionResult', 'play again', session);
    void this.router.navigate(
      ['/tabs/play/challenge', result.passPlayMode],
      { replaceUrl: true },
    );
  }

  backToPlay(): void {
    this.goBack();
  }

  async openDonate(): Promise<void> {
    await this.donatePrompt.openDonateLink();
  }

  openDonatePage(): void {
    void this.router.navigate(['/donate']);
  }
}
