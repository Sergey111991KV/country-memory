import { Pipe, PipeTransform, inject } from '@angular/core';

import type { AppLang } from '../i18n/messages';
import { LocaleService } from '../services/locale.service';

@Pipe({
  name: 'i18n',
  standalone: true,
  pure: true,
})
export class I18nPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(
    key: string,
    vars?: Record<string, string | number> | null,
    lang?: AppLang,
  ): string {
    return this.locale.translate(key, vars ?? undefined, lang);
  }
}
