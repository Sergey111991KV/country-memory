import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {
  APP_ICON_GROUPS,
  type AppIconId,
  type AppIconMeta,
  getAppIconAsset,
  iconsForGroup,
} from '../../core/icons/app-icons.registry';
import { CourseLaunchService } from '../../core/services/course-launch.service';
import { LocaleService } from '../../core/services/locale.service';
import {
  buildPlayCategories,
  buildPlayModesByCategory,
} from '../../play/play-mode-catalog';
import type { PlayCategoryId, PlayCategorySlide, PlayModeSlide } from '../../play/play-mode.types';

export interface PlayIconPreviewSection {
  categoryId: PlayCategoryId;
  titleKey: string;
  items: PlayModeSlide[];
}

@Component({
  selector: 'app-icon-gallery',
  templateUrl: './icon-gallery.page.html',
  styleUrls: ['./icon-gallery.page.scss'],
  standalone: false,
})
export class IconGalleryPage implements OnInit {
  protected readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly courseLaunch = inject(CourseLaunchService);

  readonly groups = APP_ICON_GROUPS;
  playCategories: PlayCategorySlide[] = [];
  playSections: PlayIconPreviewSection[] = [];

  ngOnInit(): void {
    this.rebuildPlayPreview();
  }

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

  trackCategory(_index: number, category: PlayCategorySlide): string {
    return category.id;
  }

  trackMode(_index: number, mode: PlayModeSlide): string {
    return mode.id;
  }

  trackSection(_index: number, section: PlayIconPreviewSection): string {
    return section.categoryId;
  }

  iconAsset(id: AppIconId): string {
    return getAppIconAsset(id);
  }

  goBack(): void {
    void this.router.navigate(['/tabs/settings'], {
      queryParams: { panel: 'support' },
    });
  }

  private rebuildPlayPreview(): void {
    const modesByCategory = buildPlayModesByCategory(true, this.courseLaunch.launches);
    const { wheel, recall } = buildPlayCategories(modesByCategory, true);
    this.playCategories = [...wheel, recall];
    this.playSections = (
      ['recognition', 'recall', 'course', 'explore', 'together'] as PlayCategoryId[]
    ).map((categoryId) => ({
      categoryId,
      titleKey: `play.category.${categoryId}`,
      items: modesByCategory[categoryId] ?? [],
    }));
  }
}
