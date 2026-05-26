/** Store listing loaded from App Store / Google Play (not RevenueCat). */
export interface StoreProductInfo {
  productId: string;
  title: string;
  priceString: string;
  kind: 'monthly' | 'lifetime';
  /** Android subscription base plan id (Play Console). */
  planIdentifier?: string;
  /** Android offer token for the selected base plan. */
  offerToken?: string;
}
