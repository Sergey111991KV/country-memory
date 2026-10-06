import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { CountriesCatalogService } from '../../core/services/countries-catalog.service';
import { CountryCultureModalService } from '../../core/services/country-culture-modal.service';
import { FlagAssetsService } from '../../core/services/flag-assets.service';
import { LocaleService } from '../../core/services/locale.service';
import { VisualQualityService } from '../../core/services/visual-quality.service';

export type FlagDisplaySize = 'hero' | 'card';

const LONG_PRESS_MS = 550;
const MOVE_CANCEL_PX = 12;
const WIND_ANIM_MS = 5500;
const WIND_ANIM_EASING = 'cubic-bezier(0.42, 0.08, 0.58, 0.92)';

let windFilterSeq = 0;

@Component({
  selector: 'app-flag-display',
  templateUrl: './flag-display.component.html',
  styleUrls: ['./flag-display.component.scss'],
  standalone: false,
})
export class FlagDisplayComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  private readonly flags = inject(FlagAssetsService);
  private readonly catalog = inject(CountriesCatalogService);
  readonly locale = inject(LocaleService);
  private readonly cultureModal = inject(CountryCultureModalService);
  private readonly visualQuality = inject(VisualQualityService);

  @Input({ required: true }) iso2 = '';
  @Input() size: FlagDisplaySize = 'hero';
  @Input() animate = true;
  @Input() countryLabel = '';
  @Input() enableCultureHold = true;

  readonly windFilterId = `flag-wind-${++windFilterSeq}`;

  @ViewChild('windSvg') private windSvg?: ElementRef<SVGSVGElement>;

  imageError = false;
  displaySrc = '';
  windFilterOff = false;
  holdHintVisible = false;

  private loadRetryIndex = 0;
  private windAnimations: Animation[] = [];
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private pressStartX = 0;
  private pressStartY = 0;
  /** CORS only matters for CDN rasters under the SVG wind filter; bundled flags are same-origin. */
  get imgCrossOrigin(): 'anonymous' | null {
    return this.flagWindDisplacement &&
      !this.windFilterOff &&
      this.displaySrc.startsWith('http')
      ? 'anonymous'
      : null;
  }

  get imgLoading(): 'eager' | 'lazy' {
    return this.size === 'hero' ? 'eager' : 'lazy';
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

  ngOnInit(): void {
    if (!this.displaySrc) {
      this.resetImageState();
    }
  }

  ngAfterViewInit(): void {
    this.scheduleWindSync();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['iso2'] || changes['size']) {
      this.resetImageState();
    }
    if (changes['animate'] || changes['iso2']) {
      this.scheduleWindSync();
    }
  }

  /** Respects Settings → Globe & flag detail (signal-backed for CD). */
  get flagAnimActive(): boolean {
    return this.animate && this.visualQuality.profileSig().flag.animate;
  }

  get flagWindDisplacement(): boolean {
    return this.flagAnimActive && this.visualQuality.profileSig().flag.windDisplacement;
  }

  get flagSheen(): boolean {
    return this.flagAnimActive && this.visualQuality.profileSig().flag.sheen;
  }

  get flagWindFilterStyle(): string | null {
    return this.flagWindDisplacement && !this.windFilterOff ? this.windFilterStyle : null;
  }

  ngOnDestroy(): void {
    this.cancelWindAnimations();
    this.clearPressTimer();
  }

  onImageError(): void {
    if (this.imgCrossOrigin) {
      // CDN without CORS headers (or a cached non-CORS copy): retry without the filter.
      this.windFilterOff = true;
      this.scheduleWindSync();
      return;
    }
    this.loadRetryIndex += 1;
    this.displaySrc = this.buildDisplaySrc();
    if (this.displaySrc) {
      return;
    }
    this.imageError = true;
    this.cancelWindAnimations();
  }

  private resetImageState(): void {
    this.imageError = false;
    this.windFilterOff = false;
    this.loadRetryIndex = 0;
    this.displaySrc = this.buildDisplaySrc();
  }

  /** Bundled SVG first, then FlagCDN rasters (see FlagAssetsService). */
  private buildDisplaySrc(): string {
    return this.flags.sourceForAttempt(this.iso2, this.loadRetryIndex, this.size === 'hero');
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

  private scheduleWindSync(): void {
    queueMicrotask(() => this.syncWindAnimations());
  }

  private syncWindAnimations(): void {
    this.cancelWindAnimations();
    if (!this.flagAnimActive || this.imageError || !this.displaySrc) {
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const svg = this.windSvg?.nativeElement;
    if (!svg || !this.flagWindDisplacement) {
      return;
    }
    const timing: KeyframeAnimationOptions = {
      duration: WIND_ANIM_MS,
      iterations: Infinity,
      easing: WIND_ANIM_EASING,
    };
    const turbulence = svg.querySelector('feTurbulence');
    if (turbulence) {
      this.windAnimations.push(
        turbulence.animate(
          [
            { baseFrequency: '0.012 0.032' },
            { baseFrequency: '0.018 0.048' },
            { baseFrequency: '0.014 0.042' },
            { baseFrequency: '0.012 0.032' },
          ],
          timing,
        ),
      );
    }
    const displacement = svg.querySelector('feDisplacementMap');
    if (displacement) {
      this.windAnimations.push(
        displacement.animate([{ scale: 6 }, { scale: 13 }, { scale: 6 }], timing),
      );
    }
  }

  private cancelWindAnimations(): void {
    for (const anim of this.windAnimations) {
      anim.cancel();
    }
    this.windAnimations = [];
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
