import { TestBed } from '@angular/core/testing';

import { GeoJsonCacheService } from './geo-json-cache.service';

describe('GeoJsonCacheService', () => {
  let service: GeoJsonCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeoJsonCacheService],
    });
    service = TestBed.inject(GeoJsonCacheService);
  });

  it('fetches GeoJSON once and reuses the parsed features promise', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                type: 'Feature',
                properties: { ISO_A2: 'FR', GDP_MD: 2500 },
                geometry: { type: 'Polygon', coordinates: [] },
              },
            ],
          }),
      } as Response),
    );

    const first = await service.getPoliticalFeatures();
    const second = await service.getPoliticalFeatures();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('builds GDP map once from cached features', async () => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                type: 'Feature',
                properties: { ISO_A2: 'DE', GDP_MD: 4000 },
                geometry: { type: 'Polygon', coordinates: [] },
              },
              {
                type: 'Feature',
                properties: { ISO_A2: 'XX', GDP_MD: 'n/a' },
                geometry: { type: 'Polygon', coordinates: [] },
              },
            ],
          }),
      } as Response),
    );

    const first = await service.getGdpByIso();
    const second = await service.getGdpByIso();

    expect(first).toBe(second);
    expect(first.get('DE')).toBe(4000);
    expect(first.has('XX')).toBe(false);
  });
});
