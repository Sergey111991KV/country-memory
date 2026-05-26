import { TestBed } from '@angular/core/testing';

import { I18nPipe } from './i18n.pipe';
import { LocaleService } from '../services/locale.service';

describe('I18nPipe', () => {
  let pipe: I18nPipe;
  let locale: jasmine.SpyObj<LocaleService>;

  beforeEach(() => {
    locale = jasmine.createSpyObj('LocaleService', ['translate']);
    locale.translate.and.returnValue('translated');

    TestBed.configureTestingModule({
      providers: [{ provide: LocaleService, useValue: locale }],
    });
    pipe = TestBed.runInInjectionContext(() => new I18nPipe());
  });

  it('passes key, vars, and lang to LocaleService', () => {
    const vars = { n: 3 };
    expect(pipe.transform('play.title', vars, 'ru')).toBe('translated');
    expect(locale.translate).toHaveBeenCalledWith('play.title', vars, 'ru');
  });

  it('normalizes null vars to undefined', () => {
    pipe.transform('common.ok', null, 'en');
    expect(locale.translate).toHaveBeenCalledWith('common.ok', undefined, 'en');
  });
});
