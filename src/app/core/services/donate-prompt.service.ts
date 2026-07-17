import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { isBillingEnabled } from '../utils/billing-mode';
import { LegalLinksService } from './legal-links.service';
import { SessionAccessService } from './session-access.service';
import { StorageService } from './storage.service';

const LAST_SHOWN_KEY = 'flagfield_donate_last_shown_iso_v1';

/** Milliseconds in one calendar month (30 days). */
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class DonatePromptService {
  private readonly storage = inject(StorageService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly legal = inject(LegalLinksService);
  private readonly router = inject(Router);

  private lastShownIso: string | null = null;
  private hydrated = false;
  private claimInFlight = false;

  get gamesThreshold(): number {
    return environment.donatePromptAfterGames;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const stored = await this.storage.get<string>(LAST_SHOWN_KEY);
    this.lastShownIso = typeof stored === 'string' && stored.length > 0 ? stored : null;
    this.hydrated = true;
  }

  /** True when donate URL is configured, billing is off, and prompt timing rules are met. */
  async shouldShow(): Promise<boolean> {
    if (isBillingEnabled()) {
      return false;
    }
    if (!this.legal.hasDonateUrl()) {
      return false;
    }
    await this.hydrate();
    await this.sessionAccess.hydrate();
    const completed = this.sessionAccess.completedGamesSig();
    if (completed < this.gamesThreshold) {
      return false;
    }
    if (!this.lastShownIso) {
      return true;
    }
    const lastShown = Date.parse(this.lastShownIso);
    if (!Number.isFinite(lastShown)) {
      return true;
    }
    return Date.now() - lastShown >= MONTH_MS;
  }

  async markShown(): Promise<void> {
    const iso = new Date().toISOString();
    this.lastShownIso = iso;
    this.hydrated = true;
    await this.storage.set(LAST_SHOWN_KEY, iso);
  }

  /** Returns true once when the prompt should be shown; marks it as shown immediately. */
  async claimPrompt(): Promise<boolean> {
    if (this.claimInFlight) {
      return false;
    }
    if (!(await this.shouldShow())) {
      return false;
    }
    this.claimInFlight = true;
    try {
      await this.markShown();
      return true;
    } finally {
      this.claimInFlight = false;
    }
  }

  /** Navigate to donate prompt page when due; returns true if navigated. */
  async maybeNavigateToDonate(): Promise<boolean> {
    if (!(await this.claimPrompt())) {
      return false;
    }
    await this.router.navigate(['/donate']);
    return true;
  }

  async openDonateLink(): Promise<void> {
    await this.legal.openDonate();
  }
}
