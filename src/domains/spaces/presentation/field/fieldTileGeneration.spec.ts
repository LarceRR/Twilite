import { describe, expect, it } from 'vitest';

import {
  activeFieldTileHeight,
  fieldTileVariant,
  inactiveFieldTileHeight,
} from './fieldTileGeneration';

describe('seeded field tile generation', () => {
  it('returns the same height and style for a seed and world coordinate', () => {
    expect(inactiveFieldTileHeight('same-seed', 12, 4)).toBe(
      inactiveFieldTileHeight('same-seed', 12, 4),
    );
    expect(fieldTileVariant('same-seed', 12, 4, false, {
      inactiveMinHeight: 0,
      inactiveMaxHeight: 3,
      activeMinHeight: 6,
      activeMaxHeight: 9,
    })).toEqual(fieldTileVariant('same-seed', 12, 4, false, {
      inactiveMinHeight: 0,
      inactiveMaxHeight: 3,
      activeMinHeight: 6,
      activeMaxHeight: 9,
    }));
  });

  it('changes the layout when the seed changes', () => {
    const first = Array.from({ length: 30 }, (_, col) =>
      inactiveFieldTileHeight('alpha', col, 2),
    );
    const second = Array.from({ length: 30 }, (_, col) =>
      inactiveFieldTileHeight('beta', col, 2),
    );
    expect(first).not.toEqual(second);
  });

  it('keeps inactive heights within zero to three world units', () => {
    for (let col = 0; col < 300; col += 1) {
      expect(inactiveFieldTileHeight('weighted', col, 3)).toBeGreaterThanOrEqual(0);
      expect(inactiveFieldTileHeight('weighted', col, 3)).toBeLessThanOrEqual(3);
    }
  });

  it('chooses active heights inside the configured inclusive range', () => {
    for (let col = 0; col < 50; col += 1) {
      const height = activeFieldTileHeight('active', col, 7, 5, 8);
      expect(height).toBeGreaterThanOrEqual(5);
      expect(height).toBeLessThanOrEqual(8);
    }
  });
});
