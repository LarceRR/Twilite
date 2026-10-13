import { describe, expect, it } from 'vitest';

import { advanceSpritePlayback, easeOutCubic } from './surfaceObjectAnimation';

describe('surfaceObjectAnimation', () => {
  it('eases the column rise from zero to one without overshoot', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('advances variable-duration frames and loops without losing elapsed time', () => {
    const frames = [
      { frame: 4, durationMs: 100 },
      { frame: 8, durationMs: 200 },
    ];
    const first = advanceSpritePlayback({ index: 0, elapsedMs: 0 }, frames, 150);
    expect(first).toEqual({ cursor: { index: 1, elapsedMs: 50 }, frame: 8 });

    const looped = advanceSpritePlayback(first.cursor, frames, 300);
    expect(looped).toEqual({ cursor: { index: 1, elapsedMs: 50 }, frame: 8 });
  });

  it('holds a one-frame sprite without scheduling another frame', () => {
    expect(
      advanceSpritePlayback({ index: 0, elapsedMs: 0 }, [{ frame: 2, durationMs: 0 }], 1000),
    ).toEqual({ cursor: { index: 0, elapsedMs: 1000 }, frame: 2 });
  });
});
