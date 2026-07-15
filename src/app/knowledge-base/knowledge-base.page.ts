import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  ViewChild,
} from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { IonContent, ViewWillEnter } from '@ionic/angular';

import type { AppLang } from '../core/i18n/messages';
import type { Country, CountryFact, CountryProfileField } from '../core/data/country.types';
import type { CountryLearnStatus, KnowledgeCollectionDef } from '../core/data/knowledge-manifest.types';
import type { FactLearnStateId } from '../core/data/knowledge-manifest.types';
import { CountriesCatalogService } from '../core/services/countries-catalog.service';
import { CountryKnowledgeService } from '../core/services/country-knowledge.service';
import { CountryLearnStatusService } from '../core/services/country-learn-status.service';
import { KnowledgeManifestService } from '../core/services/knowledge-manifest.service';
import { LocaleService } from '../core/services/locale.service';
import { UserLearnedService } from '../core/services/user-learned.service';
import { PerfLogService } from '../core/services/perf-log.service';

export interface CountryMarkRow {
  country: Country;
  displayName: string;
  status: CountryLearnStatus;
  expanded: boolean;
  fields: CountryProfileField[];
  facts: CountryFact[];
  fieldStates: Map<string, FactLearnStateId>;
  factStates: Map<string, FactLearnStateId>;
}

export interface CollectionCardStats {
  engaged: number;
  total: number;
  saved: number;
}

@Component({
  selector: 'app-knowledge-base',
  templateUrl: './knowledge-base.page.html',
  styleUrls: ['./knowledge-base.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeBasePage implements ViewWillEnter {
  @ViewChild('knowledgeContent') private knowledgeContent?: IonContent;

  readonly catalog = inject(CountriesCatalogService);
  protected readonly locale = inject(LocaleService);
  readonly manifest = inject(KnowledgeManifestService);

  private readonly countryKnowledge = inject(CountryKnowledgeService);
  private readonly userLearned = inject(UserLearnedService);
  private readonly learnStatus = inject(CountryLearnStatusService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly perf = inject(PerfLogService);

  loading = true;
  collections: KnowledgeCollectionDef[] = [];
  countryRows: CountryMarkRow[] = [];
  displayCountryRows: CountryMarkRow[] = [];
  readonly collectionStatsMap = new Map<string, CollectionCardStats>();
  searchQuery = '';
  continentFilter: string | null = null;
  learnedSet = new Set<string>();

  private rowsCacheReady = false;
  private lastMarksRevision = -1;
  private lastBuiltLanguage: AppLang | null = null;

  ionViewWillEnter(): void {
    void this.scrollToTop();
    void this.refresh();
  }

  collectionStats(col: KnowledgeCollectionDef): CollectionCardStats {
    return (
      this.collectionStatsMap.get(col.continent) ?? {
        engaged: 0,
        total: 0,
        saved: 0,
      }
    );
  }

  onSearchQueryChange(): void {
    this.applyListFilter();
    this.cdr.markForCheck();
  }

  clearCollectionFilter(): void {
    void this.tapHaptic();
    this.continentFilter = null;
    this.searchQuery = '';
    this.applyListFilter();
    this.cdr.markForCheck();
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

  trackCollection(_index: number, col: KnowledgeCollectionDef): string {
    return col.continent;
  }

  trackCountryRow(_index: number, row: CountryMarkRow): string {
    return row.country.iso2;
  }

  trackField(_index: number, field: CountryProfileField): string {
    return field.id;
  }

  trackFact(_index: number, fact: CountryFact): string {
    return fact.id;
  }

  selectCountry(row: CountryMarkRow): void {
    if (row.expanded) {
      row.expanded = false;
      this.cdr.markForCheck();
      return;
    }
    for (const r of this.countryRows) {
      r.expanded = r === row;
    }
    this.cdr.markForCheck();
  }

  filterByCollection(col: KnowledgeCollectionDef): void {
    void this.tapHaptic();
    this.continentFilter =
      this.continentFilter === col.continent ? null : col.continent;
    this.searchQuery = '';
    this.applyListFilter();
    this.cdr.markForCheck();
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
    const stats = this.collectionStats(col);
    const title = this.locale.translate(col.titleKey);
    const meta = this.locale.translate('knowledge.collectionCardMeta', {
      engaged: stats.engaged,
      total: stats.total,
      saved: stats.saved,
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
    row.status = this.learnStatus.getCountryStatusSync(
      row.country.iso2,
      this.learnedSet,
    );
    this.lastMarksRevision = this.userLearned.getMarksRevision();
    this.rebuildCollectionStats();
    this.applyListFilter();
    this.cdr.markForCheck();
  }

  async refresh(): Promise<void> {
    const totalSpan = this.perf.span('KnowledgeBase', 'refresh');
    const showLoading = !this.rowsCacheReady;
    if (showLoading) {
      this.loading = true;
      this.cdr.markForCheck();
    }
    try {
      await this.manifest.ensureLoaded();
      await this.catalog.ensureLoaded();
      await this.countryKnowledge.ensureLoaded();
      await this.userLearned.hydrate();

      const marksRevision = this.userLearned.getMarksRevision();
      const language = this.locale.language;
      const canReuseRows =
        this.rowsCacheReady &&
        this.lastMarksRevision === marksRevision &&
        this.lastBuiltLanguage === language &&
        this.countryRows.length > 0;

      this.collections = this.manifest.getCollections();

      if (canReuseRows) {
        this.rebuildCollectionStats();
        this.applyListFilter();
        totalSpan.end({
          reused: true,
          rows: this.countryRows.length,
          visible: this.displayCountryRows.length,
        });
        return;
      }

      const buildSpan = this.perf.span('KnowledgeBase', 'buildRows');
      this.learnedSet = await this.userLearned.getLearnedCountryIsos();
      const countries = [...this.catalog.getAll()].sort((a, b) =>
        this.catalog
          .localizedName(a, language)
          .localeCompare(this.catalog.localizedName(b, language), language),
      );
      this.countryRows = countries.map((country) => this.buildCountryRow(country, language));
      buildSpan.end({ rows: this.countryRows.length });
      this.lastMarksRevision = marksRevision;
      this.lastBuiltLanguage = language;
      this.rowsCacheReady = true;
      this.rebuildCollectionStats();
      this.applyListFilter();
      totalSpan.end({
        reused: false,
        rows: this.countryRows.length,
        visible: this.displayCountryRows.length,
      });
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
      void this.scrollToTop();
    }
  }

  private async scrollToTop(): Promise<void> {
    await this.knowledgeContent?.scrollToTop(0);
  }

  private applyListFilter(): void {
    let rows = this.countryRows;
    if (this.continentFilter) {
      rows = rows.filter((r) => r.country.continent === this.continentFilter);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const name = row.displayName.toLowerCase();
        return name.includes(q) || row.country.iso2.toLowerCase().includes(q);
      });
    }
    this.displayCountryRows = rows;
  }

  private rebuildCollectionStats(): void {
    this.collectionStatsMap.clear();
    const totalsByContinent = new Map<string, number>();
    for (const country of this.catalog.getAll()) {
      totalsByContinent.set(
        country.continent,
        (totalsByContinent.get(country.continent) ?? 0) + 1,
      );
    }
    for (const col of this.collections) {
      let engaged = 0;
      let saved = 0;
      for (const row of this.countryRows) {
        if (row.country.continent !== col.continent) {
          continue;
        }
        if (row.status.id === 'collection') {
          saved += 1;
        }
        if (row.status.inQuizPool || row.status.id === 'collection') {
          engaged += 1;
        }
      }
      this.collectionStatsMap.set(col.continent, {
        engaged,
        saved,
        total: totalsByContinent.get(col.continent) ?? 0,
      });
    }
  }

  private buildCountryRow(country: Country, language: AppLang): CountryMarkRow {
    const status = this.learnStatus.getCountryStatusSync(
      country.iso2,
      this.learnedSet,
    );
    const fields = this.countryKnowledge.getProfileFields(country, language);
    const facts = this.countryKnowledge.getTriviaFacts(country.iso2);
    return {
      country,
      displayName: this.catalog.localizedName(country, language),
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
    row.status = this.learnStatus.getCountryStatusSync(
      row.country.iso2,
      this.learnedSet,
    );
    this.lastMarksRevision = this.userLearned.getMarksRevision();
    this.rebuildCollectionStats();
    this.applyListFilter();
    this.cdr.markForCheck();
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
