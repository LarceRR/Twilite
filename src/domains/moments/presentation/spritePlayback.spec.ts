import { describe, expect, it } from 'vitest';

import type { MomentSprite } from '../domain/entities/MomentCatalog';
import {
  authorizedImageSource,
  createSpriteClock,
  frameDelayMs,
  frameUv,
  glClearColor,
  nextLoopIndex,
  pixelFrameLayout,
  sheetCacheLeaf,
  sheetFrameOrigin,
  spriteLoops,
} from './spritePlayback';

const sprite: MomentSprite = {
  sheetUrl: 'http://example.test/sheet',
  frameWidth: 16,
  frameHeight: 16,
  columns: 2,
  rows: 2,
  frameCount: 3,
  frames: [
    { frame: 0, durationMs: 40 },
    { frame: 1, durationMs: 80 },
    { frame: 2, durationMs: 80 },
  ],
  staticPreviewFrame: 0,
};

describe('sprite playback', () => {
  it('locates a frame in the sheet grid', () => {
    expect(sheetFrameOrigin(2, 2, 16, 16)).toEqual({ x: 0, y: 16 });
    expect(sheetFrameOrigin(3, 2, 16, 16)).toEqual({ x: 16, y: 16 });
  });

  it('loops and clamps frame delays', () => {
    expect(nextLoopIndex(2, 3)).toBe(0);
    expect(nextLoopIndex(0, 1)).toBe(0);
    expect(frameDelayMs(1)).toBe(16);
    expect(frameDelayMs(50_000)).toBe(10_000);
  });

  it('animates only when the clip has more than one frame', () => {
    expect(spriteLoops(sprite)).toBe(true);
    expect(spriteLoops({ ...sprite, frames: sprite.frames.slice(0, 1), frameCount: 1 })).toBe(
      false,
    );
    expect(spriteLoops(null)).toBe(false);
  });

  it('scales a frame onto whole device pixels', () => {
    expect(pixelFrameLayout(sprite, 32, 32, 2)).toEqual({
      scale: 2,
      clipWidth: 32,
      clipHeight: 32,
      sheetWidth: 64,
      sheetHeight: 64,
    });
  });

  it('turns a theme hex into a GL clear color', () => {
    const color = glClearColor('#EFEBE1');
    expect(color.r).toBeCloseTo(0xef / 255);
    expect(color.g).toBeCloseTo(0xeb / 255);
    expect(color.b).toBeCloseTo(0xe1 / 255);
    expect(glClearColor('nope')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('crops the top-right cell and keeps the token out of the cache name', () => {
    const uv = frameUv(sprite, 1);
    expect(uv.u0).toBeGreaterThan(0.5);
    expect(uv.u1).toBeLessThan(1);
    expect(uv.v0).toBeGreaterThan(0.5);
    expect(uv.v1).toBeLessThan(1);
    expect(sheetCacheLeaf(sprite.sheetUrl)).toBe(sheetCacheLeaf(sprite.sheetUrl));
    expect(sheetCacheLeaf(`${sprite.sheetUrl}?token=secret`)).not.toBe(
      sheetCacheLeaf(sprite.sheetUrl),
    );
    expect(sheetCacheLeaf(sprite.sheetUrl)).not.toContain('secret');
  });

  it('paints the current frame before waiting, and a still never schedules', () => {
    const painted: number[] = [];
    let queued: (() => void) | undefined;
    const stop = createSpriteClock({
      frames: sprite.frames,
      paint: (frame) => painted.push(frame),
      schedule: (_delay, run) => {
        queued = run;
        return 1;
      },
      cancel: () => undefined,
    });
    expect(painted).toEqual([0]);
    queued?.();
    expect(painted).toEqual([0, 1]);
    stop();
    queued?.();
    expect(painted).toEqual([0, 1]);

    let scheduled = 0;
    createSpriteClock({
      frames: [{ frame: 4, durationMs: 80 }],
      paint: () => undefined,
      schedule: () => {
        scheduled += 1;
        return 1;
      },
      cancel: () => undefined,
    });
    expect(scheduled).toBe(0);
  });

  it('refuses an image source without an auth header', () => {
    expect(authorizedImageSource('http://example.test/a.png', null)).toBeNull();
    expect(
      authorizedImageSource('http://example.test/a.png', { Authorization: 'Bearer t' }),
    ).toEqual({
      uri: 'http://example.test/a.png',
      headers: { Authorization: 'Bearer t' },
      cache: 'force-cache',
    });
  });
});
