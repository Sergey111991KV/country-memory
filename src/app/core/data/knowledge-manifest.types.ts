import type { ContinentId, FactCategory, KnowledgeStats } from './country.types';

export type KnowledgeStatField = keyof Pick<
  KnowledgeStats,
  | 'countriesLearned'
  | 'countriesTotal'
  | 'factsLearned'
  | 'factsTotal'
  | 'capitalsLearned'
  | 'capitalsTotal'
  | 'languagesLearned'
  | 'languagesTotal'
  | 'currenciesLearned'
  | 'currenciesTotal'
  | 'continentsLearned'
  | 'continentsTotal'
  | 'populationsLearned'
  | 'populationsTotal'
  | 'areasLearned'
  | 'areasTotal'
>;

export interface KnowledgeStatMetricDef {
  id: string;
  icon: string;
  labelKey: string;
  field: KnowledgeStatField;
  totalField: KnowledgeStatField;
}

export interface KnowledgeFactCategoryDef {
  id: FactCategory;
  icon: string;
  tier: 'core' | 'extra';
  order: number;
}

export interface KnowledgeCollectionDef {
  id: string;
  titleKey: string;
  image: string;
  continent: ContinentId;
}

export interface KnowledgeLearnStateDef {
  labelKey: string;
  icon: string;
}

export interface KnowledgeManifestFile {
  version: number;
  factCountPerCountry: number;
  statMetrics: KnowledgeStatMetricDef[];
  factCategories: KnowledgeFactCategoryDef[];
  collections: KnowledgeCollectionDef[];
  learnStates: Record<string, KnowledgeLearnStateDef>;
}

export type CountryLearnStatusId = 'new' | 'partial' | 'collection';

export interface CountryLearnStatus {
  id: CountryLearnStatusId;
  manual: boolean;
  inQuizPool: boolean;
  factsKnown: number;
  factsTotal: number;
  fieldsKnown: number;
  fieldsTotal: number;
  marksKnown: number;
  marksTotal: number;
}

export type FactLearnStateId = 'known' | 'unknown';

export interface FactLearnState {
  id: FactLearnStateId;
  factId: string;
}
