import { Injectable, inject } from '@angular/core';

import type { AppLang } from '../i18n/messages';
import type { Country } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { FlagAssetsService } from './flag-assets.service';
import { LocaleService } from './locale.service';

export type HomeFeedCardKind = 'flag' | 'fact' | 'capital';

export interface HomeFeedCard {
  id: string;
  kind: HomeFeedCardKind;
  iso: string;
  countryName: string;
  titleKey: string;
  body: string;
  flagUrl: string;
}

@Injectable({ providedIn: 'root' })
export class HomeFeedService {
  private readonly catalog = inject(CountriesCatalogService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly flags = inject(FlagAssetsService);
  private readonly locale = inject(LocaleService);

  private deck: HomeFeedCard[] = [];
  private deckIndex = 0;
  private builtForLang: AppLang | null = null;

  async ensureDeck(): Promise<void> {
    const lang = this.locale.language;
    if (this.deck.length > 0 && this.builtForLang === lang) {
      return;
    }
    await this.catalog.ensureLoaded();
    await this.knowledge.ensureLoaded();
    const countries = this.shuffle([...this.catalog.getAll()]);
    const cards: HomeFeedCard[] = [];
    for (const country of countries) {
      cards.push(...this.cardsForCountry(country, lang));
      if (cards.length >= 48) {
        break;
      }
    }
    this.deck = this.shuffle(cards).slice(0, 36);
    this.deckIndex = 0;
    this.builtForLang = lang;
  }

  currentCard(): HomeFeedCard | null {
    return this.deck[this.deckIndex] ?? null;
  }

  advance(): HomeFeedCard | null {
    if (this.deck.length === 0) {
      return null;
    }
    this.deckIndex = (this.deckIndex + 1) % this.deck.length;
    return this.currentCard();
  }

  private cardsForCountry(country: Country, lang: AppLang): HomeFeedCard[] {
    const iso = country.iso2.toUpperCase();
    const name = this.catalog.localizedName(country, lang);
    const flagUrl = this.flags.heroUrl(country.iso2);
    const out: HomeFeedCard[] = [
      {
        id: `${iso}-flag`,
        kind: 'flag',
        iso,
        countryName: name,
        titleKey: 'home.feed.flagTitle',
        body: name,
        flagUrl,
      },
      {
        id: `${iso}-capital`,
        kind: 'capital',
        iso,
        countryName: name,
        titleKey: 'home.feed.capitalTitle',
        body: this.catalog.localizedCapital(country, lang),
        flagUrl,
      },
    ];
    const trivia = this.knowledge.getTriviaFacts(country.iso2);
    const fact = trivia[0];
    if (fact) {
      out.push({
        id: fact.id,
        kind: 'fact',
        iso,
        countryName: name,
        titleKey: 'home.feed.factTitle',
        body: this.knowledge.factText(fact, lang),
        flagUrl,
      });
    }
    return out;
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
