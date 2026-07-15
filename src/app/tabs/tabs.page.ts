import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { LocaleService } from '../core/services/locale.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit {
  readonly locale = inject(LocaleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.applyActiveTabClass(this.tabFromUrl(this.router.url));
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.applyActiveTabClass(this.tabFromUrl(e.urlAfterRedirects)));
  }

  onTabsChanged(ev: { tab: string }): void {
    this.applyActiveTabClass(ev.tab);
  }

  private tabFromUrl(url: string): string {
    const match = url.match(/\/tabs\/([^/?#]+)/);
    return match?.[1] ?? 'play';
  }

  private applyActiveTabClass(tab: string): void {
    const root = document.documentElement;
    for (const id of ['play', 'knowledge', 'progress', 'settings'] as const) {
      root.classList.toggle(`flagfield-active-tab-${id}`, tab === id);
    }
  }
}
