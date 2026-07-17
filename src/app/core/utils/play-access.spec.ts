import { environment } from '../../../environments/environment';
import { ensurePlaySessionAccess, ensurePremiumPlayAccess } from './play-access';

describe('play access gates', () => {
  let previousBillingEnabled: boolean;
  let router: { navigate: jasmine.Spy };
  let subscription: {
    init: jasmine.Spy;
    isSubscribed: jasmine.Spy;
  };
  let sessionAccess: {
    hydrate: jasmine.Spy;
    canStartGame: jasmine.Spy;
  };

  beforeEach(() => {
    previousBillingEnabled = environment.billingEnabled;
    router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
    subscription = {
      init: jasmine.createSpy('init').and.resolveTo(undefined),
      isSubscribed: jasmine.createSpy('isSubscribed').and.returnValue(false),
    };
    sessionAccess = {
      hydrate: jasmine.createSpy('hydrate').and.resolveTo(undefined),
      canStartGame: jasmine.createSpy('canStartGame').and.returnValue(true),
    };
  });

  afterEach(() => {
    (environment as { billingEnabled: boolean }).billingEnabled =
      previousBillingEnabled;
  });

  describe('when billingEnabled is false', () => {
    beforeEach(() => {
      (environment as { billingEnabled: boolean }).billingEnabled = false;
    });

    it('allows any play session without consulting subscription limits', async () => {
      sessionAccess.canStartGame.and.returnValue(false);
      const ok = await ensurePlaySessionAccess(
        subscription as never,
        sessionAccess as never,
        router as never,
      );
      expect(ok).toBeTrue();
      expect(subscription.init).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('allows premium explore modes without subscription', async () => {
      const ok = await ensurePremiumPlayAccess(
        subscription as never,
        router as never,
      );
      expect(ok).toBeTrue();
      expect(subscription.init).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('when billingEnabled is true', () => {
    beforeEach(() => {
      (environment as { billingEnabled: boolean }).billingEnabled = true;
    });

    it('allows play when canStartGame is true', async () => {
      sessionAccess.canStartGame.and.returnValue(true);
      const ok = await ensurePlaySessionAccess(
        subscription as never,
        sessionAccess as never,
        router as never,
      );
      expect(ok).toBeTrue();
      expect(subscription.init).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('sends free users at the limit to paywall', async () => {
      sessionAccess.canStartGame.and.returnValue(false);
      const ok = await ensurePlaySessionAccess(
        subscription as never,
        sessionAccess as never,
        router as never,
      );
      expect(ok).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/paywall']);
    });

    it('blocks premium explore for non-subscribers', async () => {
      subscription.isSubscribed.and.returnValue(false);
      const ok = await ensurePremiumPlayAccess(
        subscription as never,
        router as never,
      );
      expect(ok).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/paywall']);
    });

    it('allows premium explore for subscribers', async () => {
      subscription.isSubscribed.and.returnValue(true);
      const ok = await ensurePremiumPlayAccess(
        subscription as never,
        router as never,
      );
      expect(ok).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
