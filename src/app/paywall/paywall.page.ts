import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { ToastController, ViewWillEnter } from '@ionic/angular';

import { LegalLinksService } from '../core/services/legal-links.service';
import { LocaleService } from '../core/services/locale.service';
import { SessionAccessService } from '../core/services/session-access.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-paywall',
  templateUrl: './paywall.page.html',
  styleUrls: ['./paywall.page.scss'],
  standalone: false,
})
export class PaywallPage implements OnInit, ViewWillEnter {
  readonly sub = inject(SubscriptionService);
  private readonly sessionAccess = inject(SessionAccessService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly legal = inject(LegalLinksService);
  protected readonly locale = inject(LocaleService);

  readonly devMockBilling = environment.devMockBilling;
  readonly billingDebugEnabled = this.sub.canUseBillingDebug();
  readonly isNative = Capacitor.isNativePlatform();
  readonly freeGamesLimit = environment.freeGamesLimit;

  legalReady = false;
  busy = false;
  freeGamesLeft = environment.freeGamesLimit;

  ngOnInit(): void {
    this.legalReady = this.legal.hasConfiguredLegalUrls();
  }

  ionViewWillEnter(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    await this.sub.init();
    await this.sessionAccess.hydrate();
    this.freeGamesLeft = this.sessionAccess.remainingFreeGames(this.sub.isSubscribed());
    if (!this.sub.offeringsLoadingSig() && this.sub.canPurchaseInApp()) {
      await this.sub.refreshOfferings();
    }
  }

  goBack(): void {
    void this.router.navigate(['/tabs/play']);
  }

  async subscribeMonthly(): Promise<void> {
    if (this.busy || !this.sub.canPurchaseInApp()) {
      return;
    }
    this.busy = true;
    const result = await this.sub.purchaseMonthly();
    this.busy = false;
    await this.handlePurchaseResult(result);
  }

  async buyLifetime(): Promise<void> {
    if (this.busy || !this.sub.canPurchaseInApp()) {
      return;
    }
    this.busy = true;
    const result = await this.sub.purchaseLifetime();
    this.busy = false;
    await this.handlePurchaseResult(result);
  }

  async restore(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    const result = await this.sub.restore();
    this.busy = false;
    if (result === 'success') {
      await this.toast('paywall.toastRestored');
      this.goBack();
      return;
    }
    if (result === 'empty') {
      await this.toast('paywall.toastNoRestore');
      return;
    }
    await this.toast('paywall.toastRestoreFail');
  }

  async toggleDebugPremium(): Promise<void> {
    await this.sub.toggleDebugPremium();
    await this.refresh();
    const key = this.sub.isSubscribed()
      ? 'paywall.toastDevOn'
      : 'paywall.toastCancelled';
    await this.toast(key);
  }

  async openManageSubscriptions(): Promise<void> {
    await this.sub.openManageSubscriptions();
  }

  openPrivacy(): void {
    void this.legal.openPrivacy();
  }

  openTerms(): void {
    void this.legal.openTerms();
  }

  formatPremiumExpiry(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(this.locale.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  private async handlePurchaseResult(
    result: 'success' | 'cancelled' | 'error',
  ): Promise<void> {
    if (result === 'success') {
      await this.toast('paywall.toastThankYou');
      this.goBack();
      return;
    }
    if (result === 'cancelled') {
      await this.toast('paywall.toastCancelled');
      return;
    }
    await this.toast('paywall.toastPurchaseFail');
  }

  private async toast(key: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.locale.translate(key),
      duration: 2200,
    });
    await t.present();
  }
}
