import { TestBed } from '@angular/core/testing';

import { I18nModule } from '../i18n/i18n.module';
import { StorageService } from './storage.service';
import { SubscriptionService } from './subscription.service';
import { environment } from '../../../environments/environment';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let storage: StorageService;
  let previousBillingEnabled: boolean;

  beforeEach(async () => {
    previousBillingEnabled = environment.billingEnabled;
    (environment as { billingEnabled: boolean }).billingEnabled = true;
    TestBed.configureTestingModule({
      imports: [I18nModule],
    });
    service = TestBed.inject(SubscriptionService);
    storage = TestBed.inject(StorageService);
    localStorage.removeItem('flagfield_dev_premium');
    await storage.remove('flagfield_billing_debug_premium');
  });

  afterEach(() => {
    (environment as { billingEnabled: boolean }).billingEnabled = previousBillingEnabled;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
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

  it('should simulate before native store when devMockBilling is on', async () => {
    await service.init();
    service.storeConfiguredSig.set(true);
    service.billingPlatformSig.set('ios');
    service.monthlyProductSig.set({
      productId: 'flagfield_premium_monthly',
      title: 'Premium Monthly',
      kind: 'monthly',
      priceString: '$2.99',
    });
    expect(service.canPurchaseInApp()).toBeTrue();
    expect(service.canSimulateBilling()).toBeTrue();
    const result = await service.purchaseMonthly();
    expect(result).toBe('success');
    expect(service.debugPremiumActive()).toBeTrue();
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
