import { Component, inject } from '@angular/core';

import { LocaleService } from '../core/services/locale.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  readonly locale = inject(LocaleService);
}
