import { PLAY_CHILD_ROUTES } from './play-routing.module';

describe('PLAY_CHILD_ROUTES', () => {
  const paths = PLAY_CHILD_ROUTES.map((r) => r.path);

  it('registers challenge and pass-play routes', () => {
    expect(paths).toContain('challenge/:mode');
    expect(paths).toContain('pass-play/:mode');
  });

  it('registers recall quiz routes', () => {
    expect(paths).toContain('knowledge-quiz');
    expect(paths).toContain('facts-quiz');
  });

  it('registers course learning routes', () => {
    expect(paths).toContain('learn');
  });

  it('registers explore routes', () => {
    expect(paths).toContain('globe-find');
    expect(paths).toContain('map-find');
    expect(paths).toContain('map-mark/:filterId');
    expect(paths).toContain('facts-drill');
    expect(paths).toContain('session-result');
  });

  it('registers play hub root', () => {
    expect(paths).toContain('');
  });
});
