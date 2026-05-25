import { Injectable } from '@angular/core';

import type {
  KnowledgeCollectionDef,
  KnowledgeFactCategoryDef,
  KnowledgeManifestFile,
  KnowledgeStatMetricDef,
} from '../data/knowledge-manifest.types';
import type { KnowledgeStats } from '../data/country.types';

export interface ManifestStatRow {
  id: string;
  icon: string;
  labelKey: string;
  learned: number;
  total: number;
  percent: number;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeManifestService {
  private manifest: KnowledgeManifestFile | null = null;
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    const res = await fetch('assets/data/knowledge-manifest.json');
    if (!res.ok) {
      throw new Error('Failed to load knowledge manifest');
    }
    this.manifest = (await res.json()) as KnowledgeManifestFile;
    this.loaded = true;
  }

  getCollections(): KnowledgeCollectionDef[] {
    return [...(this.manifest?.collections ?? [])];
  }

  getStatMetrics(): KnowledgeStatMetricDef[] {
    return [...(this.manifest?.statMetrics ?? [])];
  }

  getFactCategories(): KnowledgeFactCategoryDef[] {
    return [...(this.manifest?.factCategories ?? [])].sort(
      (a, b) => a.order - b.order,
    );
  }

  getFactCategoryIcon(category: string): string {
    return (
      this.manifest?.factCategories.find((c) => c.id === category)?.icon ??
      'information-circle-outline'
    );
  }

  buildStatRows(stats: KnowledgeStats): ManifestStatRow[] {
    return this.getStatMetrics().map((m) => {
      const learned = stats[m.field] as number;
      const total = stats[m.totalField] as number;
      return {
        id: m.id,
        icon: m.icon,
        labelKey: m.labelKey,
        learned,
        total,
        percent: total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0,
      };
    });
  }
}
