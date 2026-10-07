/**
 * Groups of flags people commonly mix up (same colours / layout).
 * Used as distractors on the "hard" difficulty.
 */
const GROUPS: readonly (readonly string[])[] = [
  ['ID', 'MC', 'PL', 'SG', 'GL'],
  ['TD', 'RO', 'AD', 'MD'],
  ['IE', 'CI', 'IT', 'IN', 'NE'],
  ['IT', 'MX', 'HU', 'IR', 'BG', 'TJ'],
  ['AT', 'LV', 'LB', 'PE', 'CA'],
  ['NL', 'LU', 'FR', 'RU', 'HR', 'SK', 'SI', 'PY', 'RS', 'YE'],
  ['AU', 'NZ', 'TV', 'FJ', 'CK', 'GB'],
  ['NO', 'IS', 'DK', 'FI', 'SE', 'FO', 'AX'],
  ['BE', 'DE', 'UG', 'AM', 'LT'],
  ['GN', 'ML', 'SN', 'CM', 'GH', 'BO', 'ET', 'GW'],
  ['VE', 'EC', 'CO'],
  ['SV', 'NI', 'HN', 'GT', 'AR', 'BW'],
  ['JO', 'PS', 'SD', 'EH', 'KW', 'AE', 'SY', 'IQ', 'EG', 'YE'],
  ['US', 'LR', 'MY', 'PR', 'CU', 'UY', 'TG'],
  ['JP', 'BD', 'PW', 'LA', 'KR'],
  ['TR', 'TN', 'DZ', 'AZ', 'MR', 'PK'],
  ['QA', 'BH', 'NP'],
  ['CZ', 'PH', 'BS', 'CU', 'DJ'],
  ['CN', 'VN', 'HK', 'MA', 'KG'],
  ['KP', 'CR', 'TH', 'CF'],
  ['HT', 'LI', 'TW'],
  ['SO', 'MK', 'KM'],
  ['ZA', 'ZW', 'MZ', 'SS', 'KE', 'TZ', 'ZM'],
  ['EE', 'BW', 'SL', 'GA', 'RW'],
];

const SIMILAR = new Map<string, Set<string>>();
for (const group of GROUPS) {
  for (const iso of group) {
    const set = SIMILAR.get(iso) ?? new Set<string>();
    for (const other of group) {
      if (other !== iso) {
        set.add(other);
      }
    }
    SIMILAR.set(iso, set);
  }
}

/** ISO2 codes with flags easily confused with `iso2`. */
export function similarFlags(iso2: string): string[] {
  return [...(SIMILAR.get(iso2.toUpperCase()) ?? [])];
}
