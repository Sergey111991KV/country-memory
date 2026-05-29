import { TestBed } from '@angular/core/testing';

import { AppLogService } from './app-log.service';
import { PerfLogService } from './perf-log.service';

describe('PerfLogService', () => {
  let service: PerfLogService;
  let appLog: jasmine.SpyObj<AppLogService>;

  beforeEach(() => {
    appLog = jasmine.createSpyObj<AppLogService>('AppLogService', ['log']);
    appLog.log.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        PerfLogService,
        { provide: AppLogService, useValue: appLog },
      ],
    });
    service = TestBed.inject(PerfLogService);
  });

  it('should report span duration', () => {
    const span = service.span('test', 'unit');
    const ms = span.end({ ok: true });
    expect(ms).toBeGreaterThanOrEqual(0);
  });
});
