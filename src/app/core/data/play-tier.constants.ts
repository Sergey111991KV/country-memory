/** Free tier: unlimited play, 30 countries, flags + capitals only. */
export const FREE_TIER_COUNTRY_ISOS = [
  'US',
  'CA',
  'MX',
  'BR',
  'GB',
  'FR',
  'DE',
  'IT',
  'ES',
  'RU',
  'CN',
  'JP',
  'IN',
  'AU',
  'EG',
  'ZA',
  'TR',
  'SA',
  'KR',
  'TH',
  'PL',
  'NL',
  'SE',
  'AR',
  'NG',
  'KE',
  'VN',
  'ID',
  'UA',
  'GR',
] as const;

export type FreeChallengeMode =
  | 'flag_pick_country'
  | 'flag_find_map'
  | 'flag_type_country'
  | 'capital_pick_country'
  | 'country_pick_capital';

export type KnowledgeChallengeMode =
  | 'fact_pick'
  | 'flag_pick_country'
  | 'country_pick_capital'
  | 'capital_pick_country';
