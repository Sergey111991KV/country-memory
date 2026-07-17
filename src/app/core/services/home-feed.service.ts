import { Injectable, inject } from '@angular/core';

import type { AppLang } from '../i18n/messages';
import type { Country } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { FlagAssetsService } from './flag-assets.service';
import { LocaleService } from './locale.service';
import { UserLearnedService } from './user-learned.service';

/** Prompt types that can appear on the Play hub — same family as facts-drill rounds. */
export type HomeFeedCardKind =
  | 'flag'
  | 'capital'
  | 'currency'
  | 'language'
  | 'fact';

export interface HomeFeedCard {
  id: string;
  kind: HomeFeedCardKind;
  iso: string;
  countryName: string;
  titleKey: string;
  /** Clue shown to the player (capital / currency / language / fact). Empty for flag. */
  body: string;
  flagUrl: string;
}

@Injectable({ providedIn: 'root' })
export class HomeFeedService {
  private readonly catalog = inject(CountriesCatalogService);
  private readonly knowledge = inject(CountryKnowledgeService);
  private readonly flags = inject(FlagAssetsService);
  private readonly locale = inject(LocaleService);
  private readonly userLearned = inject(UserLearnedService);

  private deck: HomeFeedCard[] = [];
  private deckIndex = 0;
  private builtForKey: string | null = null;

  async ensureDeck(): Promise<void> {
    await this.userLearned.hydrate();
    const lang = this.locale.language;
    const key = `${lang}:${this.userLearned.getMarksRevision()}`;
    if (this.deck.length > 0 && this.builtForKey === key) {
      return;
    }
    await this.catalog.ensureLoaded();
    await this.knowledge.ensureLoaded();
    const countries = this.shuffle([...this.catalog.getAll()]);
    const cards: HomeFeedCard[] = [];
    for (const country of countries) {
      cards.push(...this.cardsForCountry(country, lang));
      if (cards.length >= 64) {
        break;
      }
    }
    this.deck = this.shuffle(cards).slice(0, 36);
    this.deckIndex = 0;
    this.builtForKey = key;
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
        body: '',
        flagUrl,
      },
    ];

    const fields = this.knowledge.getProfileFields(country, lang);

    if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'capital'))) {
      out.push({
        id: `${iso}-capital`,
        kind: 'capital',
        iso,
        countryName: name,
        titleKey: 'home.feed.capitalTitle',
        body: this.catalog.localizedCapital(country, lang),
        flagUrl,
      });
    }

    if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'currency'))) {
      const currency = fields.find((f) => f.fieldId === 'currency');
      if (currency && currency.value !== '—') {
        out.push({
          id: `${iso}-currency`,
          kind: 'currency',
          iso,
          countryName: name,
          titleKey: 'home.feed.currencyTitle',
          body: currency.value,
          flagUrl,
        });
      }
    }

    if (this.userLearned.isFactMarked(this.knowledge.profileFieldMarkId(iso, 'language'))) {
      const language = fields.find((f) => f.fieldId === 'language');
      if (language && language.value !== '—') {
        out.push({
          id: `${iso}-language`,
          kind: 'language',
          iso,
          countryName: name,
          titleKey: 'home.feed.languageTitle',
          body: language.value,
          flagUrl,
        });
      }
    }

    for (const fact of this.knowledge.getTriviaFacts(country.iso2)) {
      if (!this.userLearned.isFactMarked(fact.id)) {
        continue;
      }
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
