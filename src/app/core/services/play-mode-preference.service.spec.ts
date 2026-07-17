import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_PLAY_MODE_ID,
  PlayModePreferenceService,
} from './play-mode-preference.service';
import { StorageService } from './storage.service';

describe('PlayModePreferenceService', () => {
  let service: PlayModePreferenceService;
  let storage: { get: jasmine.Spy; set: jasmine.Spy };

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageService', ['get', 'set']);
    storage.get.and.returnValue(Promise.resolve(null));
    storage.set.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        PlayModePreferenceService,
        { provide: StorageService, useValue: storage },
      ],
    });
    service = TestBed.inject(PlayModePreferenceService);
  });

  it('defaults to flag_pick_country', async () => {
    await service.hydrate();
    expect(service.getModeId()).toBe(DEFAULT_PLAY_MODE_ID);
  });

  it('persists preferred mode id', async () => {
    await service.setModeId('map_find');
    expect(service.getModeId()).toBe('map_find');
    expect(storage.set).toHaveBeenCalledWith(
      'flagfield_preferred_play_mode_v1',
      'map_find',
    );
  });
});
