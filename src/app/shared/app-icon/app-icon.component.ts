import { Component, HostBinding, Input } from '@angular/core';

import {
  type AppIconId,
  getAppIconAsset,
} from '../../core/icons/app-icons.registry';

export type AppIconSize = 'sm' | 'md' | 'lg' | 'dock' | 'dock-lg' | 'xl' | 'hero';

@Component({
  selector: 'app-icon',
  templateUrl: './app-icon.component.html',
  styleUrls: ['./app-icon.component.scss'],
  standalone: false,
})
export class AppIconComponent {
  @Input({ required: true }) icon!: AppIconId;
  @Input() size: AppIconSize = 'md';
  @Input() slot: string | null = null;

  @HostBinding('attr.slot')
  get hostSlot(): string | null {
    return this.slot;
  }

  @HostBinding('class.app-icon-host')
  readonly hostClass = true;

  get src(): string {
    return getAppIconAsset(this.icon);
  }

  get sizeClass(): string {
    return `app-icon--${this.size}`;
  }
}
