import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';

const MARKS_KEY = 'flagfield_learned_marks_v1';
const PERSIST_DEBOUNCE_MS = 400;

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
  private marksRevision = 0;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistInFlight: Promise<void> | null = null;

  getMarksRevision(): number {
    return this.marksRevision;
  }

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
    this.bumpMarksRevision();
    this.schedulePersist();
  }

  async unmarkCountryLearned(iso2: string): Promise<void> {
    await this.hydrate();
    this.countries.delete(iso2.toUpperCase());
    this.bumpMarksRevision();
    this.schedulePersist();
  }

  isCountryMarked(iso2: string): boolean {
    return this.countries.has(iso2.toUpperCase());
  }

  async markFactLearned(factId: string): Promise<void> {
    await this.hydrate();
    this.facts.add(factId);
    this.bumpMarksRevision();
    this.schedulePersist();
  }

  async unmarkFactLearned(factId: string): Promise<void> {
    await this.hydrate();
    this.facts.delete(factId);
    this.bumpMarksRevision();
    this.schedulePersist();
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

  async flushPersist(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistInFlight) {
      await this.persistInFlight;
      return;
    }
    await this.writePersist();
  }

  async reset(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistInFlight) {
      await this.persistInFlight;
    }
    this.countries = new Set();
    this.facts = new Set();
    this.hydrated = false;
    this.marksRevision = 0;
    await this.storage.remove(MARKS_KEY);
  }

  private bumpMarksRevision(): void {
    this.marksRevision += 1;
  }

  private schedulePersist(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.writePersist();
    }, PERSIST_DEBOUNCE_MS);
  }

  private async writePersist(): Promise<void> {
    if (this.persistInFlight) {
      await this.persistInFlight;
    }
    this.persistInFlight = (async () => {
      await this.storage.set(MARKS_KEY, {
        countries: [...this.countries],
        facts: [...this.facts],
      });
    })();
    try {
      await this.persistInFlight;
    } finally {
      this.persistInFlight = null;
    }
  }
}
