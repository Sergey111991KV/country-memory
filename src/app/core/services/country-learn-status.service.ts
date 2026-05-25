import { Injectable, inject } from '@angular/core';

import type {
  CountryLearnStatus,
  CountryLearnStatusId,
  FactLearnState,
} from '../data/knowledge-manifest.types';
import type { Country, CountryFact, CountryProfileField } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { UserLearnedService } from './user-learned.service';

@Injectable({ providedIn: 'root' })
export class CountryLearnStatusService {
  private readonly userLearned = inject(UserLearnedService);
  private readonly countryKnowledge = inject(CountryKnowledgeService);
  private readonly catalog = inject(CountriesCatalogService);

  async getCountryStatus(iso2: string, learnedSet: Set<string>): Promise<CountryLearnStatus> {
    await this.userLearned.hydrate();
    await this.countryKnowledge.ensureLoaded();
    await this.catalog.ensureLoaded();

    const iso = iso2.toUpperCase();
    const country = this.catalog.getByIso(iso);
    const manual = this.userLearned.isCountryMarked(iso);
    const inQuizPool = learnedSet.has(iso);
    const facts = country ? this.countryKnowledge.getTriviaFacts(iso) : [];
    const fields = country
      ? this.countryKnowledge.getProfileFields(country, 'en')
      : [];
    const factsKnown = facts.filter((f) => this.userLearned.isFactMarked(f.id)).length;
    const fieldsKnown = fields.filter((f) => this.userLearned.isFactMarked(f.id)).length;
    const anyMarked = factsKnown > 0 || fieldsKnown > 0;

    let id: CountryLearnStatusId = 'new';
    if (manual) {
      id = 'collection';
    } else if (anyMarked) {
      id = 'partial';
    }

    return {
      id,
      manual,
      inQuizPool,
      factsKnown,
      factsTotal: facts.length,
      fieldsKnown,
      fieldsTotal: fields.length,
      marksKnown: factsKnown + fieldsKnown,
      marksTotal: facts.length + fields.length,
    };
  }

  factStates(_iso2: string, facts: CountryFact[]): FactLearnState[] {
    return facts.map((fact) => ({
      id: this.userLearned.isFactMarked(fact.id) ? 'known' : 'unknown',
      factId: fact.id,
    }));
  }

  fieldStates(fields: CountryProfileField[]): FactLearnState[] {
    return fields.map((field) => ({
      id: this.userLearned.isFactMarked(field.id) ? 'known' : 'unknown',
      factId: field.id,
    }));
  }
}
