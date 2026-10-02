import { describe, expect, it } from 'vitest';

import { clipViewPolygon, polygonOverlapsNdc } from './viewportCellOverlap';

describe('polygonOverlapsNdc', () => {
  it('accepts a polygon inside the viewport', () => {
    expect(
      polygonOverlapsNdc([
        { x: -0.2, y: -0.2 },
        { x: 0.2, y: -0.2 },
        { x: 0.2, y: 0.2 },
        { x: -0.2, y: 0.2 },
      ]),
    ).toBe(true);
  });

  it('rejects a polygon fully outside the viewport', () => {
    expect(
      polygonOverlapsNdc([
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 3 },
        { x: 2, y: 3 },
      ]),
    ).toBe(false);
  });

  it('accepts a polygon that only crosses the viewport edge', () => {
    expect(
      polygonOverlapsNdc([
        { x: -2, y: -0.1 },
        { x: 2, y: -0.1 },
        { x: 2, y: 0.1 },
        { x: -2, y: 0.1 },
      ]),
    ).toBe(true);
  });
});

describe('clipViewPolygon', () => {
  it('drops the part of a quad that sits behind the near plane', () => {
    const clipped = clipViewPolygon(
      [
        { x: -1, y: 0, z: 1 },
        { x: 1, y: 0, z: 1 },
        { x: 1, y: 0, z: -2 },
        { x: -1, y: 0, z: -2 },
      ],
      0.5,
      100,
    );
    expect(clipped.length).toBeGreaterThanOrEqual(3);
    expect(clipped.every((point) => point.z <= -0.5 + 1e-4)).toBe(true);
  });

  it('returns nothing when every corner is behind the camera', () => {
    expect(
      clipViewPolygon(
        [
          { x: 0, y: 0, z: 1 },
          { x: 1, y: 0, z: 1 },
          { x: 1, y: 1, z: 1 },
          { x: 0, y: 1, z: 1 },
        ],
        0.05,
        100,
      ),
    ).toEqual([]);
  });
});
