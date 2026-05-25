import type {
  Country,
  CountryProfileFieldId,
} from '../data/country.types';
import type { CountryKnowledgeService } from '../services/country-knowledge.service';
import type { CountriesCatalogService } from '../services/countries-catalog.service';
import type { AppLang } from '../i18n/messages';
import { buildQuizChoices, type QuizChoice } from './quiz-options';

export type FactsDrillRoundKind =
  | 'population'
  | 'language'
  | 'currency'
  | 'capital'
  | 'flag';

const PROFILE_KINDS: FactsDrillRoundKind[] = [
  'population',
  'language',
  'currency',
  'capital',
];

export function pickFactsDrillRoundKind(mixFlags: boolean): FactsDrillRoundKind {
  if (mixFlags && Math.random() < 0.35) {
    return 'flag';
  }
  const idx = Math.floor(Math.random() * PROFILE_KINDS.length);
  return PROFILE_KINDS[idx] ?? 'population';
}

export function profileFieldIdForKind(
  kind: FactsDrillRoundKind,
): CountryProfileFieldId | null {
  switch (kind) {
    case 'population':
      return 'population';
    case 'language':
      return 'language';
    case 'currency':
      return 'currency';
    case 'capital':
      return 'capital';
    default:
      return null;
  }
}

export function buildProfileFieldChoices(
  target: Country,
  pool: Country[],
  fieldId: CountryProfileFieldId,
  catalog: CountriesCatalogService,
  knowledge: CountryKnowledgeService,
  lang: AppLang,
): QuizChoice[] {
  const labelFor = (c: Country): string => {
    const fields = knowledge.getProfileFields(c, lang);
    const hit = fields.find((f) => f.fieldId === fieldId);
    return hit?.value ?? '—';
  };
  return buildQuizChoices(target, pool, labelFor);
}
