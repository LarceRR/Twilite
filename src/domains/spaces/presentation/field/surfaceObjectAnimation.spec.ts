import { describe, expect, it } from 'vitest';

import { DEFAULT_FIELD_CONFIG } from './fieldConfig';

import {
  advanceSpritePlayback,
  collectNewlyAppearingObjectIds,
  easeOutCubic,
  surfaceObjectRiseProgress,
  SURFACE_OBJECT_ANIMATION_CONFIG,
  staggerAppearanceDelays,
} from './surfaceObjectAnimation';

describe('surfaceObjectAnimation', () => {
  it('eases the column rise from zero to one without overshoot', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('keeps a platform fully hidden until its stagger delay has elapsed', () => {
    expect(surfaceObjectRiseProgress(-SURFACE_OBJECT_ANIMATION_CONFIG.staggerDelayMs * 3)).toBe(0);
    expect(surfaceObjectRiseProgress(0)).toBe(0);
    expect(surfaceObjectRiseProgress(1)).toBeGreaterThan(0);
    expect(surfaceObjectRiseProgress(SURFACE_OBJECT_ANIMATION_CONFIG.riseDurationMs)).toBe(1);
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

  it('uses a fixed six-world-unit platform thickness', () => {
    expect(DEFAULT_FIELD_CONFIG.platform.height).toBe(6);
  });

  it('holds a one-frame sprite without scheduling another frame', () => {
    expect(
      advanceSpritePlayback({ index: 0, elapsedMs: 0 }, [{ frame: 2, durationMs: 0 }], 1000),
    ).toEqual({ cursor: { index: 0, elapsedMs: 1000 }, frame: 2 });
  });

  it('staggers object appearance in order', () => {
    expect([...staggerAppearanceDelays(['first', 'second', 'third'])]).toEqual([
      ['first', 0],
      ['second', SURFACE_OBJECT_ANIMATION_CONFIG.staggerDelayMs],
      ['third', SURFACE_OBJECT_ANIMATION_CONFIG.staggerDelayMs * 2],
    ]);
  });

  it('animates only IDs not seen before a scene remount', () => {
    const previouslySeen = new Set(['existing-a', 'existing-b']);

    expect(
      collectNewlyAppearingObjectIds(
        ['existing-a', 'existing-b', 'new-object'],
        new Set(),
        previouslySeen,
      ),
    ).toEqual(['new-object']);
  });

  it('continues the stagger queue after an earlier batch', () => {
    expect([...staggerAppearanceDelays(['later'], 240)]).toEqual([['later', 240]]);
  });
});
