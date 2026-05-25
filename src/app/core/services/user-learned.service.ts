import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';

const MARKS_KEY = 'flagfield_learned_marks_v1';

interface LearnedMarks {
  countries: string[];
  facts: string[];
}

/** Countries and facts the user marked as known (manual only). */
@Injectable({ providedIn: 'root' })
export class UserLearnedService {
  private readonly storage = inject(StorageService);

  private countries = new Set<string>();
  private facts = new Set<string>();
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    const raw = await this.storage.get<LearnedMarks>(MARKS_KEY);
    this.countries = new Set(
      (raw?.countries ?? []).map((x) => x.toUpperCase()),
    );
    this.facts = new Set(raw?.facts ?? []);
    this.hydrated = true;
  }

  async markCountryLearned(iso2: string): Promise<void> {
    await this.hydrate();
    this.countries.add(iso2.toUpperCase());
    await this.persist();
  }

  async unmarkCountryLearned(iso2: string): Promise<void> {
    await this.hydrate();
    this.countries.delete(iso2.toUpperCase());
    await this.persist();
  }

  isCountryMarked(iso2: string): boolean {
    return this.countries.has(iso2.toUpperCase());
  }

  async markFactLearned(factId: string): Promise<void> {
    await this.hydrate();
    this.facts.add(factId);
    await this.persist();
  }

  async unmarkFactLearned(factId: string): Promise<void> {
    await this.hydrate();
    this.facts.delete(factId);
    await this.persist();
  }

  isFactMarked(factId: string): boolean {
    return this.facts.has(factId);
  }

  isCountryAutoLearned(iso2: string, learnedSet: Set<string>): boolean {
    const iso = iso2.toUpperCase();
    return learnedSet.has(iso) && !this.countries.has(iso);
  }

  getLearnedFactIdsForCountry(iso2: string): string[] {
    const prefix = `${iso2.toUpperCase()}-`;
    return [...this.facts].filter((id) => id.startsWith(prefix));
  }

  /** Countries in collection or with at least one marked fact. */
  async getLearnedCountryIsos(): Promise<Set<string>> {
    await this.hydrate();
    const out = new Set(this.countries);
    for (const factId of this.facts) {
      const iso = factId.split('-')[0];
      if (iso && iso.length === 2) {
        out.add(iso.toUpperCase());
      }
    }
    return out;
  }

  private async persist(): Promise<void> {
    await this.storage.set(MARKS_KEY, {
      countries: [...this.countries],
      facts: [...this.facts],
    });
  }

  async reset(): Promise<void> {
    this.countries = new Set();
    this.facts = new Set();
    this.hydrated = false;
    await this.storage.remove(MARKS_KEY);
  }
}
