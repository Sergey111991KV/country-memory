import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class StorageService {
  async get<T>(key: string): Promise<T | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      if (value === null || value === undefined) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const encoded = JSON.stringify(value);
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value: encoded });
      return;
    }
    localStorage.setItem(key, encoded);
  }

  async remove(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  }
}
