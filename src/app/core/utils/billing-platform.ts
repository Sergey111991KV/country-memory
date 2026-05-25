import { Capacitor } from '@capacitor/core';

/** Native store used for in-app purchases on this device. */
export type BillingStorePlatform = 'ios' | 'android' | 'web';

export function detectBillingStorePlatform(): BillingStorePlatform {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    return 'ios';
  }
  if (platform === 'android') {
    return 'android';
  }
  return 'web';
}

export function isNativeBillingPlatform(
  platform: BillingStorePlatform,
): platform is 'ios' | 'android' {
  return platform === 'ios' || platform === 'android';
}
