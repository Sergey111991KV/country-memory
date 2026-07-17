import { TestBed } from '@angular/core/testing';
import { Browser } from '@capacitor/browser';

import { environment } from '../../../environments/environment';
import { LegalLinksService } from './legal-links.service';

describe('LegalLinksService donate', () => {
  let service: LegalLinksService;
  let previousDonateUrl: string;

  beforeEach(() => {
    previousDonateUrl = environment.donateUrl;
    TestBed.configureTestingModule({
      providers: [LegalLinksService],
    });
    service = TestBed.inject(LegalLinksService);
  });

  afterEach(() => {
    (environment as { donateUrl: string }).donateUrl = previousDonateUrl;
  });

  it('hasDonateUrl is true for a real HTTPS donate URL', () => {
    (environment as { donateUrl: string }).donateUrl =
      'https://destream.net/live/SergeyKosilov/donate';
    expect(service.hasDonateUrl()).toBeTrue();
  });

  it('hasDonateUrl is false for empty or placeholder URLs', () => {
    (environment as { donateUrl: string }).donateUrl = '';
    expect(service.hasDonateUrl()).toBeFalse();

    (environment as { donateUrl: string }).donateUrl = 'https://example.com/donate';
    expect(service.hasDonateUrl()).toBeFalse();

    (environment as { donateUrl: string }).donateUrl = 'http://insecure.example/donate';
    expect(service.hasDonateUrl()).toBeFalse();
  });

  it('openDonate opens the URL in a new tab on web', async () => {
    const donateUrl = 'https://destream.net/live/SergeyKosilov/donate';
    (environment as { donateUrl: string }).donateUrl = donateUrl;
    const openSpy = spyOn(window, 'open');

    await service.openDonate();

    expect(openSpy).toHaveBeenCalledWith(donateUrl, '_blank', 'noopener,noreferrer');
  });

  it('openDonate is a no-op when donate URL is not configured', async () => {
    (environment as { donateUrl: string }).donateUrl = 'https://example.com/donate';
    const openSpy = spyOn(window, 'open');
    const browserSpy = spyOn(Browser, 'open').and.resolveTo();

    await service.openDonate();

    expect(openSpy).not.toHaveBeenCalled();
    expect(browserSpy).not.toHaveBeenCalled();
  });
});
