/** Native store used for in-app purchases (via RevenueCat). */
export type BillingStorePlatform = 'ios' | 'android' | 'web';

export function detectBillingStorePlatform(): BillingStorePlatform {
  if (typeof window === 'undefined') {
    return 'web';
  }
  const cap = (window as Window & { Capacitor?: { getPlatform: () => string } })
    .Capacitor;
  const platform = cap?.getPlatform?.() ?? 'web';
  if (platform === 'ios') {
    return 'ios';
  }
  if (platform === 'android') {
    return 'android';
  }
  return 'web';
}
