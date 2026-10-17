import { describe, expect, it } from 'vitest';

import {
  fieldTileHeight,
  fieldTileMaxTopHeight,
  fieldTileVariant,
  objectPlatformHeight,
} from './fieldTileGeneration';

describe('seeded field tile generation', () => {
  it('returns the same height for the same seed and world coordinate', () => {
    expect(fieldTileHeight('same-seed', 12, 4)).toBe(fieldTileHeight('same-seed', 12, 4));
    expect(
      fieldTileVariant('same-seed', 12, 4, { tileMinHeight: 0, tileMaxHeight: 3 }),
    ).toEqual(
      fieldTileVariant('same-seed', 12, 4, { tileMinHeight: 0, tileMaxHeight: 3 }),
    );
  });

  it('changes generated heights when the seed changes', () => {
    const first = Array.from({ length: 30 }, (_, col) => fieldTileHeight('alpha', col, 2));
    const second = Array.from({ length: 30 }, (_, col) => fieldTileHeight('beta', col, 2));
    expect(first).not.toEqual(second);
  });

  it('preserves the original weighted distribution in the four-level range', () => {
    const heights = Array.from({ length: 200 }, (_, col) => fieldTileHeight('weighted', col, 3));
    expect(heights.every((height) => height >= 0 && height <= 3)).toBe(true);
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  it('supports both ends of the 0..100 scale without a forced object minimum', () => {
    expect(fieldTileHeight('endpoint', 0, 0, 100, 100)).toBe(100);
    expect(objectPlatformHeight('endpoint', 0, 0, 0, 0)).toBe(0);
  });

  it('uses the full configured range up to 100 for regular tiles', () => {
    const heights = Array.from({ length: 300 }, (_, col) =>
      fieldTileHeight('full-range', col, 3, 0, 100),
    );
    expect(heights.every((height) => height >= 0 && height <= 100)).toBe(true);
    expect(Math.max(...heights)).toBeGreaterThan(3);
    expect(new Set(heights).size).toBeGreaterThan(10);
  });

  it('normalizes independently configured reversed bounds for generation', () => {
    for (let col = 0; col < 100; col += 1) {
      const tile = fieldTileHeight('reversed', col, 5, 90, 10);
      const object = objectPlatformHeight('reversed', col, 5, 100, 0);
      expect(tile).toBeGreaterThanOrEqual(10);
      expect(tile).toBeLessThanOrEqual(90);
      expect(object).toBeGreaterThanOrEqual(0);
      expect(object).toBeLessThanOrEqual(100);
    }
  });

  it('calculates the highest elevation from unrestricted settings', () => {
    expect(
      fieldTileMaxTopHeight({
        tileMinHeight: 0,
        tileMaxHeight: 100,
        objectMinHeight: 0,
        objectMaxHeight: 100,
      }),
    ).toBe(200);
  });

  it('respects the configured object platform range', () => {
    for (let col = 0; col < 100; col += 1) {
      expect(objectPlatformHeight('objects', col, 7, 6, 9)).toBeGreaterThanOrEqual(6);
      expect(objectPlatformHeight('objects', col, 7, 6, 9)).toBeLessThanOrEqual(9);
    }
  });
});
