import { Injectable, inject, signal } from '@angular/core';

import { StorageService } from './storage.service';

const PROFILE_KEY = 'flagfield_profile_v1';
const LEGACY_SESSION_KEY = 'flagfield_auth_session_v1';

export interface UserProfile {
  displayName: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LocalAuthService {
  private readonly storage = inject(StorageService);

  readonly profile = signal<UserProfile | null>(null);
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    let raw = await this.storage.get<UserProfile>(PROFILE_KEY);
    if (!raw?.displayName) {
      const legacy = await this.storage.get<{ username?: string }>(LEGACY_SESSION_KEY);
      if (legacy?.username) {
        raw = {
          displayName: legacy.username,
          createdAt: new Date().toISOString(),
        };
        await this.storage.set(PROFILE_KEY, raw);
        await this.storage.remove(LEGACY_SESSION_KEY);
      }
    }
    if (raw?.displayName) {
      this.profile.set(raw);
    }
    this.hydrated = true;
  }

  isLoggedIn(): boolean {
    return this.profile() !== null;
  }

  displayName(): string {
    return this.profile()?.displayName ?? '';
  }

  async setDisplayName(name: string): Promise<void> {
    const displayName = name.trim();
    if (displayName.length < 2) {
      throw new Error('USERNAME_SHORT');
    }
    const profile: UserProfile = {
      displayName,
      createdAt: this.profile()?.createdAt ?? new Date().toISOString(),
    };
    this.profile.set(profile);
    this.hydrated = true;
    await this.storage.set(PROFILE_KEY, profile);
  }

  async clearProfile(): Promise<void> {
    this.profile.set(null);
    this.hydrated = false;
    await this.storage.remove(PROFILE_KEY);
    await this.storage.remove(LEGACY_SESSION_KEY);
  }
}
