import type { AppLang } from '../messages';

import { FLAGFIELD_AR } from './ar';
import { FLAGFIELD_BN } from './bn';
import { FLAGFIELD_DE } from './de';
import { FLAGFIELD_EN } from './en';
import { FLAGFIELD_ES } from './es';
import { FLAGFIELD_FR } from './fr';
import { FLAGFIELD_HI } from './hi';
import { FLAGFIELD_ID } from './id';
import { FLAGFIELD_IT } from './it';
import { FLAGFIELD_JA } from './ja';
import { FLAGFIELD_KO } from './ko';
import { FLAGFIELD_NL } from './nl';
import { FLAGFIELD_PL } from './pl';
import { FLAGFIELD_PT } from './pt';
import { FLAGFIELD_RU } from './ru';
import { FLAGFIELD_TR } from './tr';
import { FLAGFIELD_UK } from './uk';
import { FLAGFIELD_UR } from './ur';
import { FLAGFIELD_VI } from './vi';
import { FLAGFIELD_ZH } from './zh';

/** Locale bundle over English defaults (partial JSON exports are OK). */
function withEnFallback(
  messages: Record<string, string>,
): Record<string, string> {
  return { ...FLAGFIELD_EN, ...messages };
}

export const FLAGFIELD_I18N: Record<AppLang, Record<string, string>> = {
  en: FLAGFIELD_EN,
  ru: FLAGFIELD_RU,
  es: withEnFallback(FLAGFIELD_ES),
  de: withEnFallback(FLAGFIELD_DE),
  fr: withEnFallback(FLAGFIELD_FR),
  uk: withEnFallback(FLAGFIELD_UK),
  zh: withEnFallback(FLAGFIELD_ZH),
  hi: withEnFallback(FLAGFIELD_HI),
  ar: withEnFallback(FLAGFIELD_AR),
  pt: withEnFallback(FLAGFIELD_PT),
  ja: withEnFallback(FLAGFIELD_JA),
  ko: withEnFallback(FLAGFIELD_KO),
  it: withEnFallback(FLAGFIELD_IT),
  tr: withEnFallback(FLAGFIELD_TR),
  vi: withEnFallback(FLAGFIELD_VI),
  id: withEnFallback(FLAGFIELD_ID),
  pl: withEnFallback(FLAGFIELD_PL),
  nl: withEnFallback(FLAGFIELD_NL),
  bn: withEnFallback(FLAGFIELD_BN),
  ur: withEnFallback(FLAGFIELD_UR),
};

export { FLAGFIELD_EN, FLAGFIELD_RU };
