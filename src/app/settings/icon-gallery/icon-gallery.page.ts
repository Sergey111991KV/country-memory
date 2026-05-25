import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  APP_ICON_GROUPS,
  type AppIconId,
  type AppIconMeta,
  iconsForGroup,
} from '../../core/icons/app-icons.registry';
import { LocaleService } from '../../core/services/locale.service';

@Component({
  selector: 'app-icon-gallery',
  templateUrl: './icon-gallery.page.html',
  styleUrls: ['./icon-gallery.page.scss'],
  standalone: false,
})
export class IconGalleryPage {
  readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  readonly groups = APP_ICON_GROUPS;

  iconsInGroup(group: AppIconMeta['group']): AppIconMeta[] {
    return iconsForGroup(group);
  }

  groupTitleKey(group: AppIconMeta['group']): string {
    switch (group) {
      case 'brand':
        return 'icons.groupBrand';
      case 'categories':
        return 'icons.groupCategories';
      case 'modes':
        return 'icons.groupModes';
      case 'course':
        return 'icons.groupCourse';
      case 'explore':
        return 'icons.groupExplore';
      case 'system':
        return 'icons.groupSystem';
      case 'results':
        return 'icons.groupResults';
      default:
        return 'icons.galleryTitle';
    }
  }

  trackIcon(_index: number, item: AppIconMeta): AppIconId {
    return item.id;
  }

  goBack(): void {
    void this.router.navigate(['/tabs/settings'], {
      queryParams: { panel: 'support' },
    });
  }
}
