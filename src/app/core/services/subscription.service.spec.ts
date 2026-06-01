import { TestBed } from '@angular/core/testing';

import { I18nModule } from '../i18n/i18n.module';
import { SessionAccessService } from './session-access.service';
import { StorageService } from './storage.service';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let sessionAccess: SessionAccessService;
  let storage: StorageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [I18nModule],
    });
    service = TestBed.inject(SubscriptionService);
    sessionAccess = TestBed.inject(SessionAccessService);
    storage = TestBed.inject(StorageService);
    localStorage.removeItem('flagfield_dev_premium');
    await storage.remove('flagfield_billing_debug_premium');
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should allow free games before limit', async () => {
    await sessionAccess.hydrate();
    expect(sessionAccess.canStartGame(false)).toBeTrue();
    expect(sessionAccess.remainingFreeGames(false)).toBe(sessionAccess.freeGamesLimit);
  });

  it('should use debug premium when enabled', async () => {
    await storage.set('flagfield_billing_debug_premium', true);
    await service.init();
    expect(service.isSubscribed()).toBeTrue();
    expect(service.debugPremiumActive()).toBeTrue();
  });

  it('should expose web billing platform in browser', async () => {
    await service.init();
    expect(service.billingPlatformSig()).toBe('web');
    expect(service.canPurchaseInApp()).toBeFalse();
  });

  it('should simulate monthly purchase in test mode', async () => {
    await service.init();
    expect(service.canSimulateBilling()).toBeTrue();
    expect(service.canSubscribeMonthly()).toBeTrue();
    const result = await service.purchaseMonthly();
    expect(result).toBe('success');
    expect(service.isSubscribed()).toBeTrue();
    expect(service.premiumKindSig()).toBe('subscription');
    expect(service.premiumExpiresIsoSig()).toBeTruthy();
  });

  it('should resolve manage subscription url by platform signal', () => {
    service.billingPlatformSig.set('ios');
    expect(service.manageSubscriptionsUrl()).toContain('apple.com');
    service.billingPlatformSig.set('android');
    expect(service.manageSubscriptionsUrl()).toContain('play.google.com');
    service.billingPlatformSig.set('web');
    expect(service.manageSubscriptionsUrl()).toBeNull();
  });
});
