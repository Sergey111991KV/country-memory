import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import type { ContinentId } from '../../core/data/country.types';
import { CountrySceneService } from '../../core/services/country-scene.service';
import type { CountrySceneAssets } from '../../core/data/country-scene.types';
import { FlagAssetsService } from '../../core/services/flag-assets.service';
import { LocaleService } from '../../core/services/locale.service';

type SceneMode = 'loading' | 'video' | 'poster' | 'illustrated';

@Component({
  selector: 'app-country-culture-modal',
  templateUrl: './country-culture-modal.component.html',
  styleUrls: ['./country-culture-modal.component.scss'],
  standalone: false,
})
export class CountryCultureModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) iso2!: string;
  @Input({ required: true }) countryName!: string;
  @Input({ required: true }) capital!: string;
  @Input({ required: true }) continentLabel!: string;
  @Input({ required: true }) continentId!: string;

  private readonly modalCtrl = inject(ModalController);
  private readonly sceneService = inject(CountrySceneService);
  private readonly flags = inject(FlagAssetsService);
  readonly locale = inject(LocaleService);

  sceneMode: SceneMode = 'loading';
  sceneAssets: CountrySceneAssets | null = null;
  flagHeroUrl = '';
  videoFailed = false;

  private videoStarted = false;

  ngOnInit(): void {
    void this.bootScene();
  }

  ngOnDestroy(): void {
    /* video element destroyed with modal */
  }

  get posterBackground(): string {
    const url = this.sceneAssets?.posterUrl;
    return url ? `url(${url})` : 'none';
  }

  get accentStyle(): Record<string, string> {
    const accent = this.sceneAssets?.accent ?? '#8eb4dc';
    const soft = this.sceneAssets?.accentSoft ?? '#1a2a3d';
    return {
      '--culture-accent': accent,
      '--culture-accent-soft': soft,
    };
  }

  onVideoReady(el: HTMLVideoElement): void {
    if (this.videoStarted) {
      return;
    }
    this.videoStarted = true;
    void el.play().catch(() => {
      this.videoFailed = true;
      this.sceneMode = this.sceneAssets?.posterUrl ? 'poster' : 'illustrated';
    });
  }

  onVideoError(): void {
    this.videoFailed = true;
    void this.usePosterOrIllustrated();
  }

  async close(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* web */
    }
    await this.modalCtrl.dismiss();
  }

  private async bootScene(): Promise<void> {
    this.flagHeroUrl = this.flags.heroUrl(this.iso2);
    await this.sceneService.ensureManifest();
    this.sceneAssets = this.sceneService.resolveAssets(
      this.iso2,
      this.continentId as ContinentId,
    );

    if (this.sceneAssets.videoUrl) {
      const hasVideo = await this.sceneService.probeVideo(this.sceneAssets.videoUrl);
      if (hasVideo) {
        this.sceneMode = 'video';
        return;
      }
    }

    await this.usePosterOrIllustrated();
  }

  private async usePosterOrIllustrated(): Promise<void> {
    const poster = this.sceneAssets?.posterUrl;
    if (poster && (await this.sceneService.probeImage(poster))) {
      this.sceneMode = 'poster';
      return;
    }
    this.sceneMode = 'illustrated';
  }
}
