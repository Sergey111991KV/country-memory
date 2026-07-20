import type { Country } from '../data/country.types';

export interface QuizChoice {
  country: Country;
  label: string;
}

const SHUFFLE_ROUNDS = 6;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick three distractors, preferring same continent when possible. */
export function buildQuizChoices(
  target: Country,
  pool: Country[],
  labelFor: (c: Country) => string,
): QuizChoice[] {
  const targetIso = target.iso2.toUpperCase();
  const others = pool.filter((c) => c.iso2.toUpperCase() !== targetIso);
  const sameContinent = others.filter((c) => c.continent === target.continent);
  const distractorPool =
    sameContinent.length >= 3 ? sameContinent : others;

  const picked: Country[] = [];
  const bag = shuffle(distractorPool);
  for (const c of bag) {
    if (picked.length >= 3) {
      break;
    }
    if (!picked.some((p) => p.iso2.toUpperCase() === c.iso2.toUpperCase())) {
      picked.push(c);
    }
  }

  while (picked.length < 3 && others.length > picked.length) {
    for (const c of shuffle(others)) {
      if (picked.length >= 3) {
        break;
      }
      if (!picked.some((p) => p.iso2.toUpperCase() === c.iso2.toUpperCase())) {
        picked.push(c);
      }
    }
    break;
  }

  const choices: QuizChoice[] = [
    { country: target, label: labelFor(target) },
    ...picked.map((c) => ({ country: c, label: labelFor(c) })),
  ];

  let out = choices;
  for (let i = 0; i < SHUFFLE_ROUNDS; i++) {
    out = shuffle(out);
  }
  return out;
}
