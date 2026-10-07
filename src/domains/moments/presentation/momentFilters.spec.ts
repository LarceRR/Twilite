import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MOMENT_FILTERS,
  MOMENT_FILTER_COLORS,
  MOMENT_FILTERS_APPLY_TINT,
  MOMENT_FILTERS_SHEET_HEIGHT_FRACTION,
  momentFilterColorById,
  nextMomentFilterColorId,
  parsePriceValue,
  sanitizePriceInput,
} from './momentFilters';

describe('momentFilters', () => {
  it('keeps the Figma apply tint and sheet detent', () => {
    expect(MOMENT_FILTERS_APPLY_TINT).toBe('#F2BD4F');
    expect(MOMENT_FILTERS_SHEET_HEIGHT_FRACTION).toBeCloseTo(297 / 844, 5);
    expect(DEFAULT_MOMENT_FILTERS.colorId).toBe('red');
  });

  it('cycles colors and sanitizes price digits', () => {
    expect(nextMomentFilterColorId('red')).toBe(MOMENT_FILTER_COLORS[1]?.id);
    const lastColor = MOMENT_FILTER_COLORS[MOMENT_FILTER_COLORS.length - 1];
    expect(lastColor).toBeDefined();
    expect(nextMomentFilterColorId(lastColor?.id ?? '')).toBe('red');
    expect(momentFilterColorById('missing').id).toBe('red');
    expect(sanitizePriceInput('12a3')).toBe('123');
    expect(parsePriceValue('')).toBeNull();
    expect(parsePriceValue('42')).toBe(42);
  });
});
