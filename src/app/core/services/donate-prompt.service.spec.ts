import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { LegalLinksService } from './legal-links.service';
import { SessionAccessService } from './session-access.service';
import { StorageService } from './storage.service';
import { DonatePromptService } from './donate-prompt.service';

describe('DonatePromptService', () => {
  let service: DonatePromptService;
  let storage: Record<string, unknown>;
  let completedGames = 0;
  let hasDonateUrl = true;
  let openDonateSpy: jasmine.Spy;
  let previousBillingEnabled: boolean;

  beforeEach(() => {
    storage = {};
    completedGames = 0;
    hasDonateUrl = true;
    openDonateSpy = jasmine.createSpy('openDonate').and.resolveTo(undefined);
    previousBillingEnabled = environment.billingEnabled;
    (environment as { billingEnabled: boolean }).billingEnabled = false;

    TestBed.configureTestingModule({
      providers: [
        DonatePromptService,
        {
          provide: StorageService,
          useValue: {
            get: (key: string) => Promise.resolve(storage[key]),
            set: (key: string, value: unknown) => {
              storage[key] = value;
              return Promise.resolve();
            },
          },
        },
        {
          provide: SessionAccessService,
          useValue: {
            hydrate: () => Promise.resolve(),
            completedGamesSig: () => completedGames,
          },
        },
        {
          provide: LegalLinksService,
          useValue: {
            hasDonateUrl: () => hasDonateUrl,
            openDonate: () => openDonateSpy(),
          },
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    });
    service = TestBed.inject(DonatePromptService);
  });

  afterEach(() => {
    (environment as { billingEnabled: boolean }).billingEnabled = previousBillingEnabled;
  });

  it('does not show before the games threshold', async () => {
    completedGames = 9;
    expect(await service.shouldShow()).toBeFalse();
  });

  it('shows after the games threshold when never shown', async () => {
    completedGames = 10;
    expect(await service.shouldShow()).toBeTrue();
  });

  it('does not show when donate URL is missing', async () => {
    completedGames = 20;
    hasDonateUrl = false;
    expect(await service.shouldShow()).toBeFalse();
  });

  it('does not show when billing is enabled', async () => {
    completedGames = 20;
    (environment as { billingEnabled: boolean }).billingEnabled = true;
    expect(await service.shouldShow()).toBeFalse();
  });

  it('does not show again within one month', async () => {
    completedGames = 15;
    storage['flagfield_donate_last_shown_iso_v1'] = new Date().toISOString();
    await service.hydrate();
    expect(await service.shouldShow()).toBeFalse();
  });

  it('shows again after one month', async () => {
    completedGames = 20;
    const monthAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    storage['flagfield_donate_last_shown_iso_v1'] = monthAgo;
    await service.hydrate();
    expect(await service.shouldShow()).toBeTrue();
  });

  it('claimPrompt marks shown and returns true only once', async () => {
    completedGames = 10;
    expect(await service.claimPrompt()).toBeTrue();
    expect(typeof storage['flagfield_donate_last_shown_iso_v1']).toBe('string');
    expect(await service.claimPrompt()).toBeFalse();
    expect(await service.shouldShow()).toBeFalse();
  });

  it('maybeNavigateToDonate navigates when due', async () => {
    completedGames = 12;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    expect(await service.maybeNavigateToDonate()).toBeTrue();
    expect(navigateSpy).toHaveBeenCalledWith(['/donate']);
    expect(await service.maybeNavigateToDonate()).toBeFalse();
  });

  it('maybeNavigateToDonate does not navigate without donate URL', async () => {
    completedGames = 12;
    hasDonateUrl = false;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    expect(await service.maybeNavigateToDonate()).toBeFalse();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('openDonateLink opens the configured donate URL via LegalLinksService', async () => {
    await service.openDonateLink();
    expect(openDonateSpy).toHaveBeenCalled();
  });

  it('exposes gamesThreshold from environment', () => {
    expect(service.gamesThreshold).toBe(environment.donatePromptAfterGames);
  });
});
