import { describe, expect, it } from 'vitest';

import { isLabelGlyphPixelOn } from './fieldGridDigitGlyphs';

describe('fieldGridDigitGlyphs', () => {
  it('has ink for coordinate axes, digits, and comma', () => {
    expect(isLabelGlyphPixelOn('X', 0, 0)).toBe(true);
    expect(isLabelGlyphPixelOn('Y', 0, 0)).toBe(true);
    expect(isLabelGlyphPixelOn('1', 2, 0)).toBe(true);
    expect(isLabelGlyphPixelOn(',', 2, 5)).toBe(true);
    expect(isLabelGlyphPixelOn(',', 0, 0)).toBe(false);
  });
});
