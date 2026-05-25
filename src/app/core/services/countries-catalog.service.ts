import { Injectable } from '@angular/core';

import type { AppLang } from '../i18n/messages';
import type { CountriesFile, Country } from '../data/country.types';

@Injectable({ providedIn: 'root' })
export class CountriesCatalogService {
  private countries: Country[] = [];
  private readonly byIso = new Map<string, Country>();
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    const res = await fetch('assets/data/countries.json');
    if (!res.ok) {
      throw new Error('Failed to load countries catalog');
    }
    const data = (await res.json()) as CountriesFile;
    this.countries = data.countries ?? [];
    this.byIso.clear();
    for (const c of this.countries) {
      this.byIso.set(c.iso2.toUpperCase(), c);
    }
    this.loaded = true;
  }

  getAll(): Country[] {
    return [...this.countries];
  }

  getByIso(iso2: string): Country | undefined {
    return this.byIso.get(iso2.toUpperCase());
  }

  /** Countries that exist on the interactive globe. */
  filterPlayable(iso2OnGlobe: Set<string>): Country[] {
    return this.countries.filter((c) => iso2OnGlobe.has(c.iso2.toUpperCase()));
  }

  localizedName(country: Country, lang: AppLang): string {
    return country.names[lang] ?? country.names.en;
  }

  localizedCapital(country: Country, lang: AppLang): string {
    return country.capitals[lang] ?? country.capitals.en;
  }

}

