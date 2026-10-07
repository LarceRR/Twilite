import { describe, expect, it } from 'vitest';

import {
  CATALOG_SHEET_HEIGHT_FRACTION,
  catalogSheetViewportMinHeight,
} from './catalogSheetViewport';

describe('catalogSheetViewportMinHeight', () => {
  it('matches the catalog detent on the reference phone height', () => {
    expect(CATALOG_SHEET_HEIGHT_FRACTION).toBeCloseTo(780 / 844, 5);
    expect(catalogSheetViewportMinHeight(844)).toBe(780);
  });

  it('guards invalid window heights', () => {
    expect(catalogSheetViewportMinHeight(0)).toBe(1);
    expect(catalogSheetViewportMinHeight(Number.NaN)).toBe(1);
  });
});
