import { withTimeout } from './promise-timeout';

describe('withTimeout', () => {
  it('resolves with the promise result when it settles in time', async () => {
    await expectAsync(withTimeout(Promise.resolve(42), 50, () => 0)).toBeResolvedTo(42);
  });

  it('resolves with onTimeout when the promise is slow', async () => {
    const slow = new Promise<number>((resolve) => {
      setTimeout(() => resolve(99), 200);
    });
    await expectAsync(withTimeout(slow, 20, () => 0)).toBeResolvedTo(0);
  });
});
