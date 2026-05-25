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
      .speak-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: color-mix(in srgb, var(--ion-color-primary) 14%, transparent);
        color: var(--ion-color-primary);
        vertical-align: middle;
        cursor: pointer;
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
