import { describe, expect, it } from 'vitest';

import { FORM_SHEET_CORNER_RADIUS } from './formSheetCornerRadius';
import {
  MOMENT_CATALOG_SHEET_DETENT,
  MOMENT_CATALOG_SHEET_OPTIONS,
} from './momentCatalogSheetOptions';

describe('MOMENT_CATALOG_SHEET_OPTIONS', () => {
  it('stacks a tall native form sheet over the create sheet', () => {
    expect(MOMENT_CATALOG_SHEET_OPTIONS.presentation).toBe('formSheet');
    expect(MOMENT_CATALOG_SHEET_OPTIONS.headerShown).toBe(false);
    expect(MOMENT_CATALOG_SHEET_OPTIONS.sheetGrabberVisible).toBe(true);
    expect(MOMENT_CATALOG_SHEET_OPTIONS.sheetAllowedDetents).toEqual([MOMENT_CATALOG_SHEET_DETENT]);
    expect(MOMENT_CATALOG_SHEET_DETENT).toBeCloseTo(780 / 844, 5);
    expect(MOMENT_CATALOG_SHEET_OPTIONS.sheetExpandsWhenScrolledToEdge).toBe(false);
    expect(MOMENT_CATALOG_SHEET_OPTIONS.sheetCornerRadius).toBe(FORM_SHEET_CORNER_RADIUS);
    expect(MOMENT_CATALOG_SHEET_OPTIONS.contentStyle).toEqual({
      flex: 1,
      height: '100%',
      width: '100%',
    });
  });
});
