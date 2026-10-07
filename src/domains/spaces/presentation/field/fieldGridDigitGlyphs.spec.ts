import { describe, expect, it } from 'vitest';

import { isDigitGlyphPixelOn } from './fieldGridDigitGlyphs';

describe('fieldGridDigitGlyphs', () => {
  it('has ink for digits and comma', () => {
    expect(isDigitGlyphPixelOn('1', 2, 0)).toBe(true);
    expect(isDigitGlyphPixelOn(',', 2, 5)).toBe(true);
    expect(isDigitGlyphPixelOn(',', 0, 0)).toBe(false);
  });
});
