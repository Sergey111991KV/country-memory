import { Component, inject } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { ViewWillEnter } from '@ionic/angular';

import type { Country, CountryFact, CountryProfileField } from '../core/data/country.types';
import type { CountryLearnStatus, KnowledgeCollectionDef } from '../core/data/knowledge-manifest.types';
import type { FactLearnStateId } from '../core/data/knowledge-manifest.types';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CountryKnowledgeService } from '../core/services/country-knowledge.service';
import { CountryLearnStatusService } from '../core/services/country-learn-status.service';
import { KnowledgeManifestService } from '../core/services/knowledge-manifest.service';
import { LocaleService } from '../core/services/locale.service';
import { UserLearnedService } from '../core/services/user-learned.service';

export interface CountryMarkRow {
  country: Country;
  status: CountryLearnStatus;
  expanded: boolean;
  fields: CountryProfileField[];
  facts: CountryFact[];
  fieldStates: Map<string, FactLearnStateId>;
  factStates: Map<string, FactLearnStateId>;
}

@Component({
  selector: 'app-knowledge-base',
  templateUrl: './knowledge-base.page.html',
  styleUrls: ['./knowledge-base.page.scss'],
  standalone: false,
})
export class KnowledgeBasePage implements ViewWillEnter {
  readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  readonly manifest = inject(KnowledgeManifestService);

  private readonly countryKnowledge = inject(CountryKnowledgeService);
  private readonly userLearned = inject(UserLearnedService);
  private readonly learnStatus = inject(CountryLearnStatusService);

  loading = true;
  collections: KnowledgeCollectionDef[] = [];
  countryRows: CountryMarkRow[] = [];
  searchQuery = '';
  continentFilter: string | null = null;
  learnedSet = new Set<string>();
  summaryCollectionCount = 0;
  summaryEngagedCount = 0;
  summaryPartialCount = 0;
  summaryMarksKnown = 0;
  summaryMarksTotal = 0;

  ionViewWillEnter(): void {
    void this.refresh();
  }

  filteredCountryRows(): CountryMarkRow[] {
    let rows = this.countryRows;
    if (this.continentFilter) {
      rows = rows.filter((r) => r.country.continent === this.continentFilter);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((row) => {
      const name = this.catalog
        .localizedName(row.country, this.locale.language)
        .toLowerCase();
      return name.includes(q) || row.country.iso2.toLowerCase().includes(q);
    });
  }

  collectionEngagedCount(col: KnowledgeCollectionDef): number {
    return this.countryRows.filter(
      (r) =>
        r.country.continent === col.continent &&
        (r.status.inQuizPool || r.status.id === 'collection'),
    ).length;
  }

  collectionSavedCount(col: KnowledgeCollectionDef): number {
    return this.countryRows.filter(
      (r) => r.country.continent === col.continent && r.status.id === 'collection',
    ).length;
  }

  collectionTotalCount(col: KnowledgeCollectionDef): number {
    return this.catalog.getAll().filter((c) => c.continent === col.continent).length;
  }

  clearCollectionFilter(): void {
    void this.tapHaptic();
    this.continentFilter = null;
    this.searchQuery = '';
  }

  isAllRegionsActive(): boolean {
    return this.continentFilter === null;
  }

  factText(fact: CountryFact): string {
    return this.countryKnowledge.factText(fact, this.locale.language);
  }

  statusLabel(status: CountryLearnStatus): string {
    return this.locale.translate(`knowledge.status.${status.id}`);
  }

  statusIcon(status: CountryLearnStatus): string {
    const icons: Record<CountryLearnStatus['id'], string> = {
      new: 'ellipse-outline',
      partial: 'checkbox-outline',
      collection: 'bookmark',
    };
    return icons[status.id];
  }

  countryActionKey(status: CountryLearnStatus): string {
    if (status.manual) {
      return 'knowledge.action.removeCollection';
    }
    return 'knowledge.action.addCollection';
  }

  isMarkKnown(row: CountryMarkRow, markId: string): boolean {
    return (
      row.fieldStates.get(markId) === 'known' ||
      row.factStates.get(markId) === 'known'
    );
  }

  selectCountry(row: CountryMarkRow): void {
    if (row.expanded) {
      row.expanded = false;
      return;
    }
    for (const r of this.countryRows) {
      r.expanded = r === row;
    }
  }

  filterByCollection(col: KnowledgeCollectionDef): void {
    void this.tapHaptic();
    this.continentFilter =
      this.continentFilter === col.continent ? null : col.continent;
    this.searchQuery = '';
  }

  isCollectionActive(col: KnowledgeCollectionDef): boolean {
    return this.continentFilter === col.continent;
  }

  get activeCollectionLabel(): string | null {
    if (!this.continentFilter) {
      return null;
    }
    const col = this.collections.find((c) => c.continent === this.continentFilter);
    return col ? this.locale.translate(col.titleKey) : null;
  }

  collectionCardAriaLabel(col: KnowledgeCollectionDef): string {
    const title = this.locale.translate(col.titleKey);
    const meta = this.locale.translate('knowledge.collectionCardMeta', {
      engaged: this.collectionEngagedCount(col),
      total: this.collectionTotalCount(col),
      saved: this.collectionSavedCount(col),
    });
    if (this.isCollectionActive(col)) {
      return `${title}, ${meta}, ${this.locale.translate('knowledge.collectionSelected')}`;
    }
    return `${title}, ${meta}`;
  }

  async onCountryAction(row: CountryMarkRow, ev: Event): Promise<void> {
    ev.stopPropagation();
    const iso = row.country.iso2;
    if (row.status.manual) {
      await this.userLearned.unmarkCountryLearned(iso);
    } else {
      await this.userLearned.markCountryLearned(iso);
    }
    await this.tapHaptic(ImpactStyle.Medium);
    await this.syncRow(row);
  }

  async onFieldKnownChange(
    row: CountryMarkRow,
    field: CountryProfileField,
    ev: CustomEvent,
  ): Promise<void> {
    await this.onMarkKnownChange(row, field.id, Boolean(ev.detail.checked));
  }

  async onFactKnownChange(
    row: CountryMarkRow,
    fact: CountryFact,
    ev: CustomEvent,
  ): Promise<void> {
    await this.onMarkKnownChange(row, fact.id, Boolean(ev.detail.checked));
  }

  private async onMarkKnownChange(
    row: CountryMarkRow,
    markId: string,
    known: boolean,
  ): Promise<void> {
    if (known) {
      await this.userLearned.markFactLearned(markId);
    } else {
      await this.userLearned.unmarkFactLearned(markId);
    }
    await this.tapHaptic();
    row.fieldStates = this.buildFieldStateMap(row.fields);
    row.factStates = this.buildFactStateMap(row.facts);
    this.learnedSet = await this.userLearned.getLearnedCountryIsos();
    row.status = await this.learnStatus.getCountryStatus(
      row.country.iso2,
      this.learnedSet,
    );
    this.updateSummary();
  }

  async refresh(): Promise<void> {
    this.loading = true;
    try {
      await this.manifest.ensureLoaded();
      await this.catalog.ensureLoaded();
      await this.countryKnowledge.ensureLoaded();
      await this.userLearned.hydrate();
      this.collections = this.manifest.getCollections();
      this.learnedSet = await this.userLearned.getLearnedCountryIsos();
      const countries = [...this.catalog.getAll()].sort((a, b) =>
        this.catalog
          .localizedName(a, this.locale.language)
          .localeCompare(
            this.catalog.localizedName(b, this.locale.language),
            this.locale.language,
          ),
      );
      this.countryRows = [];
      for (const country of countries) {
        this.countryRows.push(await this.buildCountryRow(country));
      }
      this.updateSummary();
    } finally {
      this.loading = false;
    }
  }

  private updateSummary(): void {
    let collection = 0;
    let engaged = 0;
    let partial = 0;
    let marksKnown = 0;
    let marksTotal = 0;
    for (const row of this.countryRows) {
      if (row.status.id === 'collection') {
        collection += 1;
      }
      if (row.status.inQuizPool || row.status.id === 'collection') {
        engaged += 1;
      }
      if (row.status.id === 'partial') {
        partial += 1;
      }
      marksKnown += row.status.marksKnown;
      marksTotal += row.status.marksTotal;
    }
    this.summaryCollectionCount = collection;
    this.summaryEngagedCount = engaged;
    this.summaryPartialCount = partial;
    this.summaryMarksKnown = marksKnown;
    this.summaryMarksTotal = marksTotal;
  }

  private async buildCountryRow(country: Country): Promise<CountryMarkRow> {
    const status = await this.learnStatus.getCountryStatus(
      country.iso2,
      this.learnedSet,
    );
    const lang = this.locale.language;
    const fields = this.countryKnowledge.getProfileFields(country, lang);
    const facts = this.countryKnowledge.getTriviaFacts(country.iso2);
    return {
      country,
      status,
      expanded: false,
      fields,
      facts,
      fieldStates: this.buildFieldStateMap(fields),
      factStates: this.buildFactStateMap(facts),
    };
  }

  private buildFieldStateMap(
    fields: CountryProfileField[],
  ): Map<string, FactLearnStateId> {
    const states = this.learnStatus.fieldStates(fields);
    return new Map(states.map((s) => [s.factId, s.id]));
  }

  private buildFactStateMap(facts: CountryFact[]): Map<string, FactLearnStateId> {
    const states = this.learnStatus.factStates('', facts);
    return new Map(states.map((s) => [s.factId, s.id]));
  }

  private async syncRow(row: CountryMarkRow): Promise<void> {
    this.learnedSet = await this.userLearned.getLearnedCountryIsos();
    row.status = await this.learnStatus.getCountryStatus(
      row.country.iso2,
      this.learnedSet,
    );
    this.updateSummary();
  }

  private async tapHaptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await Haptics.impact({ style });
    } catch {
      /* unsupported */
    }
  }
}
