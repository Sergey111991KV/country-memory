import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private voicesReady = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voicesReady = true;
      };
    }
  }

  speak(text: string, lang = 'en-US'): void {
    const trimmed = text.trim();
    if (!trimmed || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.lang = lang;
    const voice = this.pickVoice(lang);
    if (voice) {
      utter.voice = voice;
    }
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private pickVoice(lang: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }
    const prefix = lang.split('-')[0]?.toLowerCase() ?? 'en';
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
      voices[0] ??
      null
    );
  }
}
