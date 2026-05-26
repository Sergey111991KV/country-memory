import { Component, Input, inject } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { CountryCultureModalService } from '../../core/services/country-culture-modal.service';
import { FlagAssetsService } from '../../core/services/flag-assets.service';
import { LocaleService } from '../../core/services/locale.service';

export type FlagDisplaySize = 'hero' | 'card';

const LONG_PRESS_MS = 550;
const MOVE_CANCEL_PX = 12;

let windFilterSeq = 0;

@Component({
  selector: 'app-flag-display',
  templateUrl: './flag-display.component.html',
  styleUrls: ['./flag-display.component.scss'],
  standalone: false,
})
export class FlagDisplayComponent {
  private readonly flags = inject(FlagAssetsService);
  private readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly cultureModal = inject(CountryCultureModalService);

  @Input({ required: true }) iso2 = '';
  @Input() size: FlagDisplaySize = 'hero';
  @Input() animate = true;
  @Input() countryLabel = '';
  @Input() enableCultureHold = true;

  readonly windFilterId = `flag-wind-${++windFilterSeq}`;

  imageError = false;
  holdHintVisible = false;

  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private pressStartX = 0;
  private pressStartY = 0;
  get src(): string {
    return this.size === 'card'
      ? this.flags.cardUrl(this.iso2)
      : this.flags.heroUrl(this.iso2);
  }

  get windFilterStyle(): string {
    return `url(#${this.windFilterId})`;
  }

  get holdAriaLabel(): string | null {
    if (!this.enableCultureHold) {
      return null;
    }
    return this.locale.translate('flag.holdExplore');
  }

  onImageError(): void {
    this.imageError = true;
  }

  onPointerDown(ev: PointerEvent): void {
    if (!this.enableCultureHold || !this.iso2 || ev.button !== 0) {
      return;
    }
    this.pressStartX = ev.clientX;
    this.pressStartY = ev.clientY;
    this.holdHintVisible = true;
    this.clearPressTimer();
    this.pressTimer = setTimeout(() => {
      void this.onLongPress();
    }, LONG_PRESS_MS);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.pressTimer) {
      return;
    }
    const dx = ev.clientX - this.pressStartX;
    const dy = ev.clientY - this.pressStartY;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      this.cancelPress();
    }
  }

  onPointerUp(): void {
    this.cancelPress();
  }

  onPointerCancel(): void {
    this.cancelPress();
  }

  private cancelPress(): void {
    this.holdHintVisible = false;
    this.clearPressTimer();
  }

  private clearPressTimer(): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  private async onLongPress(): Promise<void> {
    this.pressTimer = null;
    this.holdHintVisible = false;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      /* web */
    }
    await this.openCultureView();
  }

  private async openCultureView(): Promise<void> {
    await this.catalog.ensureLoaded();
    const country = this.catalog.getByIso(this.iso2);
    if (!country) {
      return;
    }
    const lang = this.locale.language;
    await this.cultureModal.open({
      iso2: country.iso2,
      countryName: this.catalog.localizedName(country, lang),
      capital: this.catalog.localizedCapital(country, lang),
      continentLabel: this.locale.translate(`continent.${country.continent}`),
      continentId: country.continent,
    });
  }
}
