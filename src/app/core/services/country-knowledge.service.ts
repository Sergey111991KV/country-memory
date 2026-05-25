import { Injectable, inject } from '@angular/core';

import type { AppLang } from '../i18n/messages';
import type {
  Country,
  CountryFact,
  CountryKnowledgeEntry,
  CountryKnowledgeFile,
  CountryProfileField,
  CountryProfileFieldId,
} from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';

const PROFILE_FIELD_DEFS: {
  fieldId: CountryProfileFieldId;
  labelKey: string;
  icon: string;
}[] = [
  { fieldId: 'capital', labelKey: 'knowledge.field.capital', icon: 'business-outline' },
  { fieldId: 'language', labelKey: 'knowledge.field.language', icon: 'chatbubbles-outline' },
  { fieldId: 'currency', labelKey: 'knowledge.field.currency', icon: 'cash-outline' },
  { fieldId: 'population', labelKey: 'knowledge.field.population', icon: 'people-outline' },
];

const LEGACY_FACT_CATEGORIES = new Set([
  'capital',
  'continent',
  'language',
  'currency',
  'population',
  'area',
  'borders',
  'driving_side',
]);

@Injectable({ providedIn: 'root' })
export class CountryKnowledgeService {
  private readonly catalog = inject(CountriesCatalogService);

  private file: CountryKnowledgeFile | null = null;
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    const res = await fetch('assets/data/country-knowledge.json');
    if (!res.ok) {
      throw new Error('Failed to load country knowledge');
    }
    this.file = (await res.json()) as CountryKnowledgeFile;
    this.loaded = true;
  }

  getEntry(iso2: string): CountryKnowledgeEntry | undefined {
    return this.file?.countries[iso2.toUpperCase()];
  }

  /** Unique per-country trivia only (excludes profile columns). */
  getTriviaFacts(iso2: string): CountryFact[] {
    return this.getFacts(iso2).filter(
      (f) => f.category === 'trivia' || !LEGACY_FACT_CATEGORIES.has(f.category),
    );
  }

  getFacts(iso2: string): CountryFact[] {
    return this.getEntry(iso2)?.facts ?? [];
  }

  profileFieldMarkId(iso2: string, fieldId: CountryProfileFieldId): string {
    return `${iso2.toUpperCase()}-field-${fieldId}`;
  }

  isProfileFieldMarkId(markId: string): boolean {
    return markId.includes('-field-');
  }

  getProfileFields(country: Country, lang: AppLang): CountryProfileField[] {
    const entry = this.getEntry(country.iso2);
    if (!entry) {
      return [];
    }
    const iso = country.iso2.toUpperCase();
    const values: Record<CountryProfileFieldId, string> = {
      capital: this.catalog.localizedCapital(country, lang),
      language: entry.languages.join(', ') || '—',
      currency: this.formatCurrency(entry, lang),
      population: this.formatPopulation(entry.population, lang),
    };

    return PROFILE_FIELD_DEFS.map((def) => ({
      id: this.profileFieldMarkId(iso, def.fieldId),
      fieldId: def.fieldId,
      labelKey: def.labelKey,
      icon: def.icon,
      value: values[def.fieldId],
    }));
  }

  getAllTriviaFactIds(): string[] {
    if (!this.file) {
      return [];
    }
    const ids: string[] = [];
    for (const entry of Object.values(this.file.countries)) {
      for (const f of entry.facts) {
        if (f.category === 'trivia' || !LEGACY_FACT_CATEGORIES.has(f.category)) {
          ids.push(f.id);
        }
      }
    }
    return ids;
  }

  getAllFactIds(): string[] {
    return this.getAllTriviaFactIds();
  }

  factText(fact: CountryFact, lang: AppLang): string {
    return fact.text[lang] ?? fact.text.en;
  }

  getTotalUniqueLanguages(): number {
    if (!this.file) {
      return 0;
    }
    const set = new Set<string>();
    for (const entry of Object.values(this.file.countries)) {
      for (const language of entry.languages) {
        set.add(language.toLowerCase());
      }
    }
    return set.size;
  }

  getTotalUniqueCurrencies(): number {
    if (!this.file) {
      return 0;
    }
    const set = new Set<string>();
    for (const entry of Object.values(this.file.countries)) {
      if (entry.currencyCode && entry.currencyCode !== '—') {
        set.add(entry.currencyCode);
      }
    }
    return set.size;
  }

  getCatalogTotals(playableCountries: Country[]): {
    factsTotal: number;
    fieldsTotal: number;
    capitalsTotal: number;
    populationsTotal: number;
  } {
    let factsTotal = 0;
    let fieldsTotal = 0;
    let capitalsTotal = 0;
    let populationsTotal = 0;
    for (const c of playableCountries) {
      const trivia = this.getTriviaFacts(c.iso2);
      factsTotal += trivia.length;
      if (this.getEntry(c.iso2)) {
        fieldsTotal += PROFILE_FIELD_DEFS.length;
        capitalsTotal += 1;
        populationsTotal += 1;
      }
    }
    return { factsTotal, fieldsTotal, capitalsTotal, populationsTotal };
  }

  private formatCurrency(entry: CountryKnowledgeEntry, lang: AppLang): string {
    const name = entry.currencyName[lang] ?? entry.currencyName.en;
    if (!entry.currencyCode || entry.currencyCode === '—') {
      return name;
    }
    return `${name} (${entry.currencyCode})`;
  }

  private formatPopulation(n: number, lang: AppLang): string {
    if (!n) {
      return '—';
    }
    if (lang === 'ru') {
      if (n >= 1_000_000_000) {
        return `≈ ${(n / 1_000_000_000).toFixed(1)} млрд`;
      }
      if (n >= 1_000_000) {
        return `≈ ${(n / 1_000_000).toFixed(1)} млн`;
      }
      if (n >= 1_000) {
        return `≈ ${Math.round(n / 1_000)} тыс.`;
      }
      return String(n);
    }
    if (n >= 1_000_000_000) {
      return `≈ ${(n / 1_000_000_000).toFixed(1)} billion`;
    }
    if (n >= 1_000_000) {
      return `≈ ${(n / 1_000_000).toFixed(1)} million`;
    }
    if (n >= 1_000) {
      return `≈ ${Math.round(n / 1_000)} thousand`;
    }
    return String(n);
  }
}
