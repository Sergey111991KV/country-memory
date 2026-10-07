import { Injectable, inject, signal } from '@angular/core';

import { similarFlags } from '../data/confusable-flags';
import type { Country } from '../data/country.types';
import type { QuizChoiceOptions, QuizDifficulty } from '../utils/quiz-options';
import { StorageService } from './storage.service';

const KEY = 'flagfield_difficulty_v1';

/** Answer-choice difficulty (Settings → Game settings). */
@Injectable({ providedIn: 'root' })
export class DifficultyService {
  private readonly storage = inject(StorageService);
  readonly level = signal<QuizDifficulty>('normal');
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    this.hydrated = true;
    const raw = await this.storage.get<QuizDifficulty>(KEY);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') {
      this.level.set(raw);
    }
  }

  async set(level: QuizDifficulty): Promise<void> {
    this.level.set(level);
    await this.storage.set(KEY, level);
  }

  /** Options for buildQuizChoices; `flags` adds look-alike flags on "hard". */
  choiceOptions(target: Country, flags: boolean): QuizChoiceOptions {
    const difficulty = this.level();
    return {
      difficulty,
      similar: difficulty === 'hard' && flags ? similarFlags(target.iso2) : undefined,
    };
  }
}
