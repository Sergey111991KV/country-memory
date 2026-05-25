import type { AppIconId } from '../icons/app-icons.registry';

export type ExploreFilterId =
  | 'lang_spanish'
  | 'currency_euro'
  | 'top_population'
  | 'top_area'
  | 'top_gdp';

export interface ExploreFilterDef {
  id: ExploreFilterId;
  icon: AppIconId;
  titleKey: string;
  subKey: string;
  promptKey: string;
}

export const EXPLORE_FILTER_DEFS: ExploreFilterDef[] = [
  {
    id: 'lang_spanish',
    icon: 'explore-lang',
    titleKey: 'explore.filter.langSpanish',
    subKey: 'explore.filter.langSpanishSub',
    promptKey: 'explore.filter.langSpanishPrompt',
  },
  {
    id: 'currency_euro',
    icon: 'explore-euro',
    titleKey: 'explore.filter.currencyEuro',
    subKey: 'explore.filter.currencyEuroSub',
    promptKey: 'explore.filter.currencyEuroPrompt',
  },
  {
    id: 'top_population',
    icon: 'explore-population',
    titleKey: 'explore.filter.topPopulation',
    subKey: 'explore.filter.topPopulationSub',
    promptKey: 'explore.filter.topPopulationPrompt',
  },
  {
    id: 'top_area',
    icon: 'explore-area',
    titleKey: 'explore.filter.topArea',
    subKey: 'explore.filter.topAreaSub',
    promptKey: 'explore.filter.topAreaPrompt',
  },
  {
    id: 'top_gdp',
    icon: 'explore-gdp',
    titleKey: 'explore.filter.topGdp',
    subKey: 'explore.filter.topGdpSub',
    promptKey: 'explore.filter.topGdpPrompt',
  },
];

export const EXPLORE_TOP_N = 15;
