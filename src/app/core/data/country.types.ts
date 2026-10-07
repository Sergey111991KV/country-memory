import type { AppLang } from '../i18n/messages';

export type ContinentId =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'oceania'
  | 'americas'
  | 'other';

export type LocalizedString = Partial<Record<AppLang, string>> & {
  en: string;
};

export interface Country {
  id: string;
  iso2: string;
  names: LocalizedString;
  capitals: LocalizedString;
  continent: ContinentId;
  lat: number;
  lng: number;
}

export interface CountriesFile {
  version: number;
  countries: Country[];
}

export type GameModeId =
  | 'globe_find'
  | 'map_find'
  | 'quiz'
  | 'facts_drill';

export interface LearningEvent {
  mode: GameModeId;
  countryId: string;
  correct: boolean;
  at: string;
  usedSearch: boolean;
  /** ISO2 the player picked instead (wrong answers only) — feeds "weak spots". */
  confusedWith?: string;
}

export interface CountryMastery {
  countryId: string;
  timesSeen: number;
  timesCorrect: number;
  lastAt: string | null;
  /** Leitner box 0–5 (0 = just missed / new). */
  box?: number;
  /** ISO timestamp when the country is due for review again. */
  dueAt?: string;
}

/** Standard profile columns shown for every country (not unique trivia). */
export type CountryProfileFieldId =
  | 'capital'
  | 'language'
  | 'currency'
  | 'population';

export interface CountryProfileField {
  /** Storage id for manual marks, e.g. FR-field-capital */
  id: string;
  fieldId: CountryProfileFieldId;
  labelKey: string;
  icon: string;
  value: string;
}

export type FactCategory = 'trivia';

export interface CountryFact {
  id: string;
  category: FactCategory;
  text: LocalizedString;
}

export interface CountryKnowledgeEntry {
  iso2: string;
  languages: string[];
  currencyCode: string;
  currencyName: LocalizedString;
  population: number;
  areaKm2: number;
  /** Nominal GDP in current US$ (World Bank). */
  gdpUsd?: number;
  /** Latest observation year per metric (may be 2024 when 2025 is not published yet). */
  metricsYear?: number;
  metricsPopulationYear?: number;
  metricsAreaYear?: number;
  metricsGdpYear?: number;
  subregion: LocalizedString;
  facts: CountryFact[];
}

export interface CountryKnowledgeFile {
  version: number;
  generatedAt: string;
  factCountPerCountry: number;
  /** Official reference edition year for bundled metrics. */
  metricsReferenceYear?: number;
  metricsSource?: string;
  metricsUpdatedAt?: string;
  countries: Record<string, CountryKnowledgeEntry>;
}

export interface KnowledgeCategoryStat {
  id: FactCategory | 'countries';
  learned: number;
  total: number;
}

export interface KnowledgeStats {
  countriesLearned: number;
  countriesTotal: number;
  factsLearned: number;
  factsTotal: number;
  languagesLearned: number;
  languagesTotal: number;
  currenciesLearned: number;
  currenciesTotal: number;
  continentsLearned: number;
  continentsTotal: number;
  capitalsLearned: number;
  capitalsTotal: number;
  populationsLearned: number;
  populationsTotal: number;
  areasLearned: number;
  areasTotal: number;
  byCategory: KnowledgeCategoryStat[];
}
