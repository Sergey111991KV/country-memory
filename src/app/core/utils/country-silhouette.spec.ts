import { countrySilhouette } from './country-silhouette';

describe('countrySilhouette', () => {
  it('projects a square into the viewBox', () => {
    const sil = countrySilhouette({
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    });
    expect(sil).not.toBeNull();
    expect(sil!.viewBox).toBe('0 0 100 100');
    expect(sil!.path.startsWith('M')).toBeTrue();
    expect(sil!.path.endsWith('Z')).toBeTrue();
  });

  it('drops tiny far-away parts', () => {
    const big = [[[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]];
    const far = [[[150, 0], [151, 0], [151, 1], [150, 1], [150, 0]]];
    const sil = countrySilhouette({ type: 'MultiPolygon', coordinates: [big, far] });
    expect(sil!.path.split('Z').filter(Boolean).length).toBe(1);
  });

  it('returns null without geometry', () => {
    expect(countrySilhouette(null)).toBeNull();
  });
});
