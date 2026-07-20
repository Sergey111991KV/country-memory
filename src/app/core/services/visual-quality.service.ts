import { Injectable, computed, inject, signal } from '@angular/core';

import {
  type VisualQuality,
  type VisualQualityProfile,
  visualQualityProfile,
} from '../data/visual-quality';
import { AppSettingsService } from './app-settings.service';

@Injectable({ providedIn: 'root' })
export class VisualQualityService {
  private readonly appSettings = inject(AppSettingsService);

  private readonly levelSig = signal<VisualQuality>('balanced');

  /** Current visual quality preset (globe + flags). */
  readonly level = this.levelSig.asReadonly();

  /** Reactive profile — FlagDisplay / globe read this so CD tracks signal updates. */
  readonly profileSig = computed(() => visualQualityProfile(this.levelSig()));

  profile(): VisualQualityProfile {
    return this.profileSig();
  }

  async hydrate(): Promise<void> {
    const settings = await this.appSettings.load();
    this.levelSig.set(settings.visualQuality);
  }

  async setLevel(level: VisualQuality): Promise<void> {
    this.levelSig.set(level);
    const prev = await this.appSettings.load();
    await this.appSettings.save({ ...prev, visualQuality: level });
  }
}
