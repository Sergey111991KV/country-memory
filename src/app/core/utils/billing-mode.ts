import { environment } from '../../../environments/environment';

/**
 * Master switch for in-app purchases / Premium gating.
 * Set `environment.billingEnabled` to true to restore subscriptions.
 * When false, the app is free and uses donate prompts instead.
 */
export function isBillingEnabled(): boolean {
  return environment.billingEnabled === true;
}
