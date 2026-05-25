import { Injectable, inject } from '@angular/core';

import type { Country, LocalizedString } from '../data/country.types';
import { CountriesCatalogService } from './countries-catalog.service';
import { PlayPoolService } from './play-pool.service';
import { StorageService } from './storage.service';

const PROGRESS_KEY = 'flagfield_learning_path_v1';

export interface LearningLevelDef {
  id: string;
  order: number;
  title: LocalizedString;
  subtitle: LocalizedString;
  countryIsos: string[];
  topics: ('flags' | 'capitals' | 'facts')[];
  useFreeTierPool?: boolean;
  useTierPool?: boolean;
}

interface LearningPathFile {
  version: number;
  levels: LearningLevelDef[];
}

interface LevelProgress {
  completed: boolean;
  correctAnswers: number;
  targetAnswers: number;
}

@Injectable({ providedIn: 'root' })
export class LearningPathService {
  private readonly storage = inject(StorageService);
  private readonly catalog = inject(CountriesCatalogService);
  private readonly playPool = inject(PlayPoolService);

  private levels: LearningLevelDef[] = [];
  private progress = new Map<string, LevelProgress>();
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    const res = await fetch('assets/data/learning-path.json');
    if (!res.ok) {
      throw new Error('Failed to load learning path');
    }
    const data = (await res.json()) as LearningPathFile;
    this.levels = (data.levels ?? []).sort((a, b) => a.order - b.order);
    const raw = await this.storage.get<Record<string, LevelProgress>>(PROGRESS_KEY);
    this.progress = new Map(Object.entries(raw ?? {}));
    this.loaded = true;
  }

  getLevels(): LearningLevelDef[] {
    return [...this.levels];
  }

  getLevel(id: string): LearningLevelDef | undefined {
    return this.levels.find((l) => l.id === id);
  }

  async resolveLevelPool(level: LearningLevelDef): Promise<Country[]> {
    if (level.useFreeTierPool) {
      return this.playPool.getFreePool();
    }
    if (level.useTierPool) {
      return this.playPool.poolForTier();
    }
    await this.catalog.ensureLoaded();
    return level.countryIsos
      .map((iso) => this.catalog.getByIso(iso))
      .filter((c): c is Country => Boolean(c));
  }

  getProgress(levelId: string): LevelProgress {
    return (
      this.progress.get(levelId) ?? {
        completed: false,
        correctAnswers: 0,
        targetAnswers: 10,
      }
    );
  }

  async recordCorrect(levelId: string): Promise<LevelProgress> {
    await this.ensureLoaded();
    const prev = this.getProgress(levelId);
    const next: LevelProgress = {
      ...prev,
      correctAnswers: prev.correctAnswers + 1,
      targetAnswers: prev.targetAnswers || 10,
    };
    if (next.correctAnswers >= next.targetAnswers) {
      next.completed = true;
    }
    this.progress.set(levelId, next);
    const raw: Record<string, LevelProgress> = {};
    for (const [k, v] of this.progress) {
      raw[k] = v;
    }
    await this.storage.set(PROGRESS_KEY, raw);
    return next;
  }

  isLevelUnlocked(level: LearningLevelDef, index: number): boolean {
    if (index === 0) {
      return true;
    }
    const prev = this.levels[index - 1];
    return prev ? this.getProgress(prev.id).completed : false;
  }

  async resetProgress(): Promise<void> {
    this.progress.clear();
    await this.storage.remove(PROGRESS_KEY);
  }
}
