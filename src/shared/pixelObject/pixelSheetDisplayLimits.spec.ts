import { describe, expect, it } from 'vitest';

import { fieldSpriteBoxPx, pixelSheetFitSize } from './pixelSheetDisplayLimits';

describe('pixelSheetFitSize', () => {
  it('fits inside the given box without cropping', () => {
    const layout = pixelSheetFitSize(50, 128, 256);
    expect(layout.width).toBeLessThanOrEqual(50);
    expect(layout.height).toBeLessThanOrEqual(50);
    expect(layout.width / layout.height).toBeCloseTo(128 / 256, 5);
    expect(layout.scale).toBeLessThan(1);
  });

  it('scales up small frames while keeping aspect', () => {
    const layout = pixelSheetFitSize(50, 32, 32);
    expect(layout.width).toBe(50);
    expect(layout.height).toBe(50);
    expect(layout.scale).toBeCloseTo(50 / 32, 5);
  });
});

describe('fieldSpriteBoxPx', () => {
  it('caps near-camera cells and shrinks with projected cell size', () => {
    expect(fieldSpriteBoxPx(200, 90, 0)).toBe(90);
    expect(fieldSpriteBoxPx(40, 90, 0)).toBeCloseTo(40 * 0.92, 5);
  });

  it('applies a mild extra taper for distant rows', () => {
    const near = fieldSpriteBoxPx(40, 90, 0);
    const far = fieldSpriteBoxPx(40, 90, 5);
    expect(far).toBeLessThan(near);
    expect(far / near).toBeCloseTo(1 / (1 + 5 * 0.04), 5);
  });
});
