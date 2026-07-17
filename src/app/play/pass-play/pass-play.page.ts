import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';

import type { FreeChallengeMode } from '../../core/data/play-tier.constants';
import { LocaleService } from '../../core/services/locale.service';
import { PlayPoolService } from '../../core/services/play-pool.service';
import { PlaySessionService } from '../../core/services/play-session.service';
import { SessionAccessService } from '../../core/services/session-access.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import {
  createPassPlaySession,
  type PassPlayScoringStyle,
} from '../../core/services/pass-play-session';
import { ensurePlaySessionAccess } from '../../core/utils/play-access';
import { playDebug } from '../../core/utils/play-debug';

const PASS_PLAY_MODES: FreeChallengeMode[] = [
  'flag_pick_country',
  'capital_pick_country',
  'country_pick_capital',
];

@Component({
  selector: 'app-pass-play',
  templateUrl: './pass-play.page.html',
  styleUrls: ['./pass-play.page.scss'],
  standalone: false,
})
export class PassPlayPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);
  private readonly playPool = inject(PlayPoolService);
  private readonly playSession = inject(PlaySessionService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);

  mode: FreeChallengeMode = 'flag_pick_country';
  scoringStyle: PassPlayScoringStyle = 'turns';
  playerNames = ['', ''];
  starting = false;

  ionViewWillEnter(): void {
    const mode = this.route.snapshot.paramMap.get('mode') as FreeChallengeMode | null;
    if (!mode || !PASS_PLAY_MODES.includes(mode)) {
      void this.router.navigate(['/tabs/play']);
      return;
    }
    this.mode = mode;
    this.scoringStyle = 'turns';
    if (!this.playerNames[0]?.trim()) {
      this.playerNames[0] = this.locale.translate('passPlay.playerDefault1');
    }
    if (!this.playerNames[1]?.trim()) {
      this.playerNames[1] = this.locale.translate('passPlay.playerDefault2');
    }
  }

  get modeTitleKey(): string {
    if (this.scoringStyle === 'buzzer') {
      switch (this.mode) {
        case 'flag_pick_country':
          return 'passPlay.modeSpeedFlags';
        case 'capital_pick_country':
          return 'passPlay.modeSpeedCapitals';
        case 'country_pick_capital':
          return 'passPlay.modeSpeedMixed';
        default:
          return 'passPlay.modeSpeed';
      }
    }
    switch (this.mode) {
      case 'flag_pick_country':
        return 'passPlay.modeFlags';
      case 'capital_pick_country':
        return 'passPlay.modeCapitals';
      case 'country_pick_capital':
        return 'passPlay.modeMixed';
      default:
        return 'passPlay.title';
    }
  }

  get leadKey(): string {
    return this.scoringStyle === 'buzzer'
      ? 'passPlay.subtitleBuzzer'
      : 'passPlay.subtitle';
  }

  get canAddPlayer(): boolean {
    return this.playerNames.length < 4;
  }

  get canStart(): boolean {
    return this.playerNames.filter((n) => n.trim().length > 0).length >= 2;
  }

  onScoringStyleChange(ev: CustomEvent): void {
    const v = String(ev.detail.value);
    this.scoringStyle = v === 'buzzer' ? 'buzzer' : 'turns';
  }

  addPlayer(): void {
    if (!this.canAddPlayer) {
      return;
    }
    const index = this.playerNames.length + 1;
    this.playerNames = [
      ...this.playerNames,
      this.locale.translate('passPlay.playerDefaultN', { n: index }),
    ];
  }

  removePlayer(index: number): void {
    if (this.playerNames.length <= 2) {
      return;
    }
    this.playerNames = this.playerNames.filter((_, i) => i !== index);
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  async startGame(): Promise<void> {
    if (!this.canStart || this.starting) {
      return;
    }
    this.starting = true;
    try {
      const allowed = await ensurePlaySessionAccess(
      this.subscription,
      this.sessionAccess,
      this.router,
    );
      if (!allowed) {
        return;
      }
      const players = this.playerNames
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      const pool = await this.playPool.getFilteredFreePool();
      this.playSession.clear();
      this.playSession.setPool(pool);
      const session = createPassPlaySession(
        players,
        this.mode,
        5,
        this.scoringStyle,
      );
      this.playSession.setPassPlay(session);
      playDebug('PassPlay', 'startGame', {
        players,
        mode: this.mode,
        scoringStyle: this.scoringStyle,
      });
      void this.router.navigate(['/tabs/play/challenge', this.mode]);
    } finally {
      this.starting = false;
    }
  }
}
