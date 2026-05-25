import { Pipe, PipeTransform } from '@angular/core';

import { LocaleService } from '../services/locale.service';

@Pipe({
  name: 'i18n',
  standalone: true,
  pure: false,
})
export class I18nPipe implements PipeTransform {
  constructor(private readonly locale: LocaleService) {}

  transform(
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    return this.locale.translate(key, vars);
  }
}
