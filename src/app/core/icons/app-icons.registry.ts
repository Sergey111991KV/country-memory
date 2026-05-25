/** Custom Flagfield UI icons (SVG under assets/icons/app/). */
export type AppIconId =
  | 'category-recognition'
  | 'category-recall'
  | 'category-course'
  | 'category-explore'
  | 'category-together'
  | 'mode-flag-pick'
  | 'mode-flag-map'
  | 'mode-flag-type'
  | 'mode-capital-pick'
  | 'mode-country-capital'
  | 'mode-globe-find'
  | 'mode-map-find'
  | 'mode-knowledge-quiz'
  | 'mode-facts-quiz'
  | 'mode-learning-path'
  | 'mode-pass-flags'
  | 'mode-pass-capitals'
  | 'mode-pass-mixed'
  | 'mode-pass-speed'
  | 'course-africa'
  | 'course-asia'
  | 'course-europe'
  | 'course-oceania'
  | 'course-americas'
  | 'course-capitals'
  | 'course-facts'
  | 'explore-lang'
  | 'explore-euro'
  | 'explore-population'
  | 'explore-area'
  | 'explore-gdp'
  | 'brand-mark'
  | 'ui-premium'
  | 'ui-daily-goal'
  | 'ui-lock'
  | 'result-trophy'
  | 'result-tie'
  | 'result-star'
  | 'result-spark'
  | 'result-target'
  | 'medal-gold'
  | 'medal-silver'
  | 'medal-bronze';

export interface AppIconMeta {
  id: AppIconId;
  group: 'categories' | 'modes' | 'course' | 'explore' | 'brand' | 'system' | 'results';
  labelKey: string;
  file: string;
}

const BASE = 'assets/icons/app';

export const APP_ICONS: readonly AppIconMeta[] = [
  { id: 'brand-mark', group: 'brand', labelKey: 'icons.brandMark', file: `${BASE}/brand-mark.svg` },
  { id: 'category-recognition', group: 'categories', labelKey: 'icons.categoryRecognition', file: `${BASE}/category-recognition.svg` },
  { id: 'category-recall', group: 'categories', labelKey: 'icons.categoryRecall', file: `${BASE}/category-recall.svg` },
  { id: 'category-course', group: 'categories', labelKey: 'icons.categoryCourse', file: `${BASE}/category-course.svg` },
  { id: 'category-explore', group: 'categories', labelKey: 'icons.categoryExplore', file: `${BASE}/category-explore.svg` },
  { id: 'category-together', group: 'categories', labelKey: 'icons.categoryTogether', file: `${BASE}/category-together.svg` },
  { id: 'mode-flag-pick', group: 'modes', labelKey: 'icons.modeFlagPick', file: `${BASE}/mode-flag-pick.svg` },
  { id: 'mode-flag-map', group: 'modes', labelKey: 'icons.modeFlagMap', file: `${BASE}/mode-flag-map.svg` },
  { id: 'mode-flag-type', group: 'modes', labelKey: 'icons.modeFlagType', file: `${BASE}/mode-flag-type.svg` },
  { id: 'mode-capital-pick', group: 'modes', labelKey: 'icons.modeCapitalPick', file: `${BASE}/mode-capital-pick.svg` },
  { id: 'mode-country-capital', group: 'modes', labelKey: 'icons.modeCountryCapital', file: `${BASE}/mode-country-capital.svg` },
  { id: 'mode-globe-find', group: 'modes', labelKey: 'icons.modeGlobeFind', file: `${BASE}/mode-globe-find.svg` },
  { id: 'mode-map-find', group: 'modes', labelKey: 'icons.modeMapFind', file: `${BASE}/mode-map-find.svg` },
  { id: 'mode-knowledge-quiz', group: 'modes', labelKey: 'icons.modeKnowledgeQuiz', file: `${BASE}/mode-knowledge-quiz.svg` },
  { id: 'mode-facts-quiz', group: 'modes', labelKey: 'icons.modeFactsQuiz', file: `${BASE}/mode-facts-quiz.svg` },
  { id: 'mode-learning-path', group: 'modes', labelKey: 'icons.modeLearningPath', file: `${BASE}/mode-learning-path.svg` },
  { id: 'mode-pass-flags', group: 'modes', labelKey: 'icons.modePassFlags', file: `${BASE}/mode-pass-flags.svg` },
  { id: 'mode-pass-capitals', group: 'modes', labelKey: 'icons.modePassCapitals', file: `${BASE}/mode-pass-capitals.svg` },
  { id: 'mode-pass-mixed', group: 'modes', labelKey: 'icons.modePassMixed', file: `${BASE}/mode-pass-mixed.svg` },
  { id: 'mode-pass-speed', group: 'modes', labelKey: 'icons.modePassSpeed', file: `${BASE}/mode-pass-speed.svg` },
  { id: 'course-africa', group: 'course', labelKey: 'icons.courseAfrica', file: `${BASE}/course-africa.svg` },
  { id: 'course-asia', group: 'course', labelKey: 'icons.courseAsia', file: `${BASE}/course-asia.svg` },
  { id: 'course-europe', group: 'course', labelKey: 'icons.courseEurope', file: `${BASE}/course-europe.svg` },
  { id: 'course-oceania', group: 'course', labelKey: 'icons.courseOceania', file: `${BASE}/course-oceania.svg` },
  { id: 'course-americas', group: 'course', labelKey: 'icons.courseAmericas', file: `${BASE}/course-americas.svg` },
  { id: 'course-capitals', group: 'course', labelKey: 'icons.courseCapitals', file: `${BASE}/course-capitals.svg` },
  { id: 'course-facts', group: 'course', labelKey: 'icons.courseFacts', file: `${BASE}/course-facts.svg` },
  { id: 'explore-lang', group: 'explore', labelKey: 'icons.exploreLang', file: `${BASE}/explore-lang.svg` },
  { id: 'explore-euro', group: 'explore', labelKey: 'icons.exploreEuro', file: `${BASE}/explore-euro.svg` },
  { id: 'explore-population', group: 'explore', labelKey: 'icons.explorePopulation', file: `${BASE}/explore-population.svg` },
  { id: 'explore-area', group: 'explore', labelKey: 'icons.exploreArea', file: `${BASE}/explore-area.svg` },
  { id: 'explore-gdp', group: 'explore', labelKey: 'icons.exploreGdp', file: `${BASE}/explore-gdp.svg` },
  { id: 'ui-premium', group: 'system', labelKey: 'icons.uiPremium', file: `${BASE}/ui-premium.svg` },
  { id: 'ui-daily-goal', group: 'system', labelKey: 'icons.uiDailyGoal', file: `${BASE}/ui-daily-goal.svg` },
  { id: 'ui-lock', group: 'system', labelKey: 'icons.uiLock', file: `${BASE}/ui-lock.svg` },
  { id: 'result-trophy', group: 'results', labelKey: 'icons.resultTrophy', file: `${BASE}/result-trophy.svg` },
  { id: 'result-tie', group: 'results', labelKey: 'icons.resultTie', file: `${BASE}/result-tie.svg` },
  { id: 'result-star', group: 'results', labelKey: 'icons.resultStar', file: `${BASE}/result-star.svg` },
  { id: 'result-spark', group: 'results', labelKey: 'icons.resultSpark', file: `${BASE}/result-spark.svg` },
  { id: 'result-target', group: 'results', labelKey: 'icons.resultTarget', file: `${BASE}/result-target.svg` },
  { id: 'medal-gold', group: 'results', labelKey: 'icons.medalGold', file: `${BASE}/medal-gold.svg` },
  { id: 'medal-silver', group: 'results', labelKey: 'icons.medalSilver', file: `${BASE}/medal-silver.svg` },
  { id: 'medal-bronze', group: 'results', labelKey: 'icons.medalBronze', file: `${BASE}/medal-bronze.svg` },
] as const;

export const APP_ICON_GROUPS: AppIconMeta['group'][] = [
  'brand',
  'categories',
  'modes',
  'course',
  'explore',
  'system',
  'results',
];

export function getAppIconAsset(id: AppIconId): string {
  const meta = APP_ICONS.find((i) => i.id === id);
  return meta?.file ?? `${BASE}/mode-flag-pick.svg`;
}

export function iconsForGroup(group: AppIconMeta['group']): AppIconMeta[] {
  return APP_ICONS.filter((i) => i.group === group);
}
