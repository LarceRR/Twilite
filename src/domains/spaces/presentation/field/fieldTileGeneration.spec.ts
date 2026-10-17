import { describe, expect, it } from 'vitest';

import {
  fieldTileHeight,
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

  it('keeps regular tiles in the shared configured range', () => {
    for (let col = 0; col < 300; col += 1) {
      const height = fieldTileHeight('weighted', col, 3, 1, 3);
      expect(height).toBeGreaterThanOrEqual(1);
      expect(height).toBeLessThanOrEqual(3);
    }
  });

  it('generates varied heights across the field without active-band special cases', () => {
    const settings = { tileMinHeight: 0, tileMaxHeight: 3 };
    const heights = Array.from({ length: 50 }, (_, col) =>
      fieldTileVariant('shared-range', col, 7, settings).height,
    );
    expect(heights.every((height) => height >= 0 && height <= 3)).toBe(true);
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  it('keeps object platforms higher than the maximum regular tile height', () => {
    for (let col = 0; col < 100; col += 1) {
      expect(objectPlatformHeight('objects', col, 7, 6, 9)).toBeGreaterThan(3);
    }
  });
});
