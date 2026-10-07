import { describe, expect, it } from 'vitest';
import { MOMENT_FILTERS_SHEET_HEIGHT_FRACTION } from '@/domains/moments/presentation/momentFilters';
import { FORM_SHEET_CORNER_RADIUS } from './formSheetCornerRadius';

import {
  MOMENT_FILTERS_SHEET_DETENT,
  MOMENT_FILTERS_SHEET_OPTIONS,
} from './momentFiltersSheetOptions';

describe('MOMENT_FILTERS_SHEET_OPTIONS', () => {
  it('stacks a compact native form sheet over the catalog', () => {
    expect(MOMENT_FILTERS_SHEET_OPTIONS.presentation).toBe('formSheet');
    expect(MOMENT_FILTERS_SHEET_OPTIONS.headerShown).toBe(false);
    expect(MOMENT_FILTERS_SHEET_OPTIONS.sheetGrabberVisible).toBe(true);
    expect(MOMENT_FILTERS_SHEET_OPTIONS.sheetAllowedDetents).toEqual([MOMENT_FILTERS_SHEET_DETENT]);
    expect(MOMENT_FILTERS_SHEET_DETENT).toBe(MOMENT_FILTERS_SHEET_HEIGHT_FRACTION);
    expect(MOMENT_FILTERS_SHEET_OPTIONS.sheetCornerRadius).toBe(FORM_SHEET_CORNER_RADIUS);
    expect(MOMENT_FILTERS_SHEET_OPTIONS.contentStyle).toEqual({ height: '100%' });
  });
});
