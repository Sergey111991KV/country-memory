import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

import { environment } from '../../../environments/environment';

/** Hostnames that must never count as “configured” for store release. */
const PLACEHOLDER_LEGAL_HOSTS = new Set([
  'example.com',
  'www.example.com',
  'your-domain.com',
  'www.your-domain.com',
]);

function isPlaceholderLegalUrl(url: string | undefined | null): boolean {
  const raw = (url ?? '').trim();
  if (!raw) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return true;
  }
  if (parsed.protocol !== 'https:') {
    return true;
  }
  const host = parsed.hostname.toLowerCase();
  if (PLACEHOLDER_LEGAL_HOSTS.has(host)) {
    return true;
  }
  if (host === 'localhost' || host.endsWith('.example.com')) {
    return true;
  }
  return false;
}

@Injectable({ providedIn: 'root' })
export class LegalLinksService {
  async openUrl(url: string | undefined | null): Promise<void> {
    const u = (url ?? '').trim();
    if (isPlaceholderLegalUrl(u)) {
      return;
    }
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: u, presentationStyle: 'fullscreen' });
      return;
    }
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  openPrivacy(): Promise<void> {
    return this.openUrl(environment.privacyPolicyUrl);
  }

  openTerms(): Promise<void> {
    return this.openUrl(environment.termsOfUseUrl);
  }

  openManageSubscriptions(): Promise<void> {
    const platform = Capacitor.getPlatform();
    const url =
      platform === 'android'
        ? environment.manageSubscriptionsUrlAndroid
        : environment.manageSubscriptionsUrlIos;
    return this.openUrl(url);
  }

  /** @deprecated Use openManageSubscriptions() */
  openManageSubscriptionsIos(): Promise<void> {
    return this.openManageSubscriptions();
  }

  openDonate(): Promise<void> {
    return this.openUrl(environment.donateUrl);
  }

  openDeveloperWebsite(): Promise<void> {
    return this.openUrl(environment.developerWebsiteUrl);
  }

  openSupportEmail(): void {
    const email = (environment.supportEmail ?? '').trim();
    if (!email) {
      return;
    }
    const href = `mailto:${encodeURIComponent(email)}`;
    if (Capacitor.isNativePlatform()) {
      void Browser.open({ url: href });
      return;
    }
    window.location.href = href;
  }

  hasPrivacyUrl(): boolean {
    return !isPlaceholderLegalUrl(environment.privacyPolicyUrl);
  }

  hasTermsUrl(): boolean {
    return !isPlaceholderLegalUrl(environment.termsOfUseUrl);
  }

  hasSupportEmail(): boolean {
    return (environment.supportEmail ?? '').trim().length > 0;
  }

  hasDonateUrl(): boolean {
    return !isPlaceholderLegalUrl(environment.donateUrl);
  }

  hasDeveloperWebsite(): boolean {
    return !isPlaceholderLegalUrl(environment.developerWebsiteUrl);
  }

  /**
   * True when both URLs are non-empty, HTTPS, and not template placeholders.
   * Set real `privacyPolicyUrl` and `termsOfUseUrl` in environment before release.
   */
  hasConfiguredLegalUrls(): boolean {
    return (
      !isPlaceholderLegalUrl(environment.privacyPolicyUrl) &&
      !isPlaceholderLegalUrl(environment.termsOfUseUrl)
    );
  }
}
