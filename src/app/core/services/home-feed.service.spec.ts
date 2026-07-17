import { TestBed } from '@angular/core/testing';

import { CountriesCatalogService } from './countries-catalog.service';
import { CountryKnowledgeService } from './country-knowledge.service';
import { FlagAssetsService } from './flag-assets.service';
import { LocaleService } from './locale.service';
import { UserLearnedService } from './user-learned.service';
import { HomeFeedService } from './home-feed.service';
import { FIXTURE_COUNTRIES, FIXTURE_KNOWLEDGE } from '../../play/testing/play-test-fixtures';

describe('HomeFeedService', () => {
  let service: HomeFeedService;
  let learnedMarks = new Set<string>();

  beforeEach(() => {
    learnedMarks = new Set<string>();
    TestBed.configureTestingModule({
      providers: [
        HomeFeedService,
        {
          provide: CountriesCatalogService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getAll: () => FIXTURE_COUNTRIES,
            localizedName: (country: (typeof FIXTURE_COUNTRIES)[number]) =>
              country.names.en,
            localizedCapital: (country: (typeof FIXTURE_COUNTRIES)[number]) =>
              country.capitals.en,
          },
        },
        {
          provide: CountryKnowledgeService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getEntry: (iso: string) => FIXTURE_KNOWLEDGE[iso.toUpperCase()],
            getTriviaFacts: () => [],
            profileFieldMarkId: (iso: string, field: string) =>
              `${iso.toUpperCase()}-field-${field}`,
            getProfileFields: (country: (typeof FIXTURE_COUNTRIES)[number]) => {
              const entry = FIXTURE_KNOWLEDGE[country.iso2.toUpperCase()];
              return [
                {
                  id: `${country.iso2}-field-currency`,
                  fieldId: 'currency',
                  labelKey: 'knowledge.field.currency',
                  icon: 'cash-outline',
                  value: entry ? `${entry.currencyName.en} (${entry.currencyCode})` : '—',
                },
                {
                  id: `${country.iso2}-field-language`,
                  fieldId: 'language',
                  labelKey: 'knowledge.field.language',
                  icon: 'chatbubbles-outline',
                  value: entry?.languages?.join(', ') ?? '—',
                },
              ];
            },
            factText: () => 'Fact body',
          },
        },
        {
          provide: FlagAssetsService,
          useValue: { heroUrl: (iso: string) => `flag://${iso}` },
        },
        {
          provide: LocaleService,
          useValue: { language: 'en' },
        },
        {
          provide: UserLearnedService,
          useValue: {
            hydrate: () => Promise.resolve(),
            getMarksRevision: () => learnedMarks.size,
            isFactMarked: (id: string) => learnedMarks.has(id),
          },
        },
      ],
    });
    service = TestBed.inject(HomeFeedService);
  });

  it('defaults to flag cards when nothing is marked', async () => {
    await service.ensureDeck();
    const card = service.currentCard();
    expect(card?.kind).toBe('flag');
  });

  it('includes capital cards when capital is marked', async () => {
    learnedMarks.add('ES-field-capital');
    await service.ensureDeck();
    const kinds = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      const card = service.currentCard();
      if (card) {
        kinds.add(card.kind);
      }
      service.advance();
    }
    expect(kinds.has('capital')).toBeTrue();
  });

  it('includes currency cards when currency is marked', async () => {
    learnedMarks.add('DE-field-currency');
    await service.ensureDeck();
    const kinds = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const card = service.currentCard();
      if (card) {
        kinds.add(card.kind);
      }
      service.advance();
    }
    expect(kinds.has('currency')).toBeTrue();
    expect(kinds.has('flag')).toBeTrue();
  });

  it('includes language cards when language is marked', async () => {
    learnedMarks.add('FR-field-language');
    await service.ensureDeck();
    const kinds = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const card = service.currentCard();
      if (card) {
        kinds.add(card.kind);
      }
      service.advance();
    }
    expect(kinds.has('language')).toBeTrue();
  });
});
