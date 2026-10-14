import { describe, expect, it } from 'vitest';

import {
  createPixelCircleMask,
  createPixelCirclePlatformGeometry,
  createPixelCircleTopGeometry,
} from './fieldPixelCircleGeometry';

describe('field pixel circle geometry', () => {
  it('creates a symmetric, hard-edged circle mask that fills the square bounds', () => {
    const steps = 24;
    const mask = createPixelCircleMask(steps);

    expect(mask).toHaveLength(steps);
    expect(mask.every((row) => row.length === steps)).toBe(true);
    expect(mask[0]![0]).toBe(false);
    expect(mask[steps - 1]![steps - 1]).toBe(false);
    expect(mask[Math.floor(steps / 2)]![0]).toBe(true);
    expect(mask[0]![Math.floor(steps / 2)]).toBe(true);

    for (let row = 0; row < steps; row += 1) {
      for (let column = 0; column < steps; column += 1) {
        expect(mask[row]![column]).toBe(mask[steps - 1 - row]![column]);
        expect(mask[row]![column]).toBe(mask[row]![steps - 1 - column]);
      }
    }
  });

  it('extrudes the same circular footprint to the configured platform height', () => {
    const geometry = createPixelCirclePlatformGeometry(60, 16, 24);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox?.min.x).toBe(-30);
    expect(geometry.boundingBox?.max.x).toBe(30);
    expect(geometry.boundingBox?.min.y).toBe(-30);
    expect(geometry.boundingBox?.max.y).toBe(30);
    expect(geometry.boundingBox?.min.z).toBe(-8);
    expect(geometry.boundingBox?.max.z).toBe(8);
    expect(geometry.getAttribute('position').count).toBeLessThan(1_000);

    geometry.dispose();
  });

  it('clips the top overlay to the same flat pixel circle', () => {
    const geometry = createPixelCircleTopGeometry(80, 24);
    geometry.computeBoundingBox();

    expect(geometry.boundingBox?.min.x).toBe(-40);
    expect(geometry.boundingBox?.max.x).toBe(40);
    expect(geometry.boundingBox?.min.y).toBe(-40);
    expect(geometry.boundingBox?.max.y).toBe(40);
    expect(geometry.boundingBox?.min.z).toBe(0);
    expect(geometry.boundingBox?.max.z).toBe(0);
    expect(geometry.getAttribute('position').count).toBeLessThan(200);

    geometry.dispose();
  });
});
