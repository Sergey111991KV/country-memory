import { Component, Input, inject } from '@angular/core';

import { LocaleService } from '../../core/services/locale.service';
import { SpeechService } from '../../core/services/speech.service';

@Component({
  selector: 'app-speak-button',
  template: `
    <button
      type="button"
      class="speak-button"
      (click)="onSpeak($event)"
      [attr.aria-label]="ariaLabel"
    >
      <ion-icon name="volume-high-outline" aria-hidden="true"></ion-icon>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: 0 0 auto;
        vertical-align: middle;
      }
      .speak-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        margin: 0;
        padding: 0;
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.35));
        border-radius: 50%;
        background: var(--glass-bg, color-mix(in srgb, var(--ion-color-primary) 14%, transparent));
        backdrop-filter: blur(12px) saturate(1.3);
        -webkit-backdrop-filter: blur(12px) saturate(1.3);
        box-shadow: var(--glass-shadow, none);
        color: var(--ion-color-primary);
        cursor: pointer;
        transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .speak-button:active {
        transform: scale(0.94);
      }
      .speak-button ion-icon {
        font-size: 1.15rem;
      }
    `,
  ],
  standalone: false,
})
export class SpeakButtonComponent {
  @Input({ required: true }) text = '';
  @Input() ariaLabel = 'Listen';

  private readonly speech = inject(SpeechService);
  private readonly locale = inject(LocaleService);

  onSpeak(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const lang = this.locale.language === 'ru' ? 'ru-RU' : 'en-US';
    this.speech.speak(this.text, lang);
  }
}
