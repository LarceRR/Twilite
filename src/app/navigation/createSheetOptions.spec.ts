import { describe, expect, it } from 'vitest';

import { CREATE_SHEET_SCREEN_OPTIONS } from './createSheetOptions';
import { FORM_SHEET_CORNER_RADIUS } from './formSheetCornerRadius';
import { CREATE_TAB_NAME } from './tabRoutes';
import { routes } from './types';

describe('CREATE_SHEET_SCREEN_OPTIONS', () => {
  it('presents create as a native form sheet over the tab bar', () => {
    expect(CREATE_SHEET_SCREEN_OPTIONS.presentation).toBe('formSheet');
    expect(CREATE_SHEET_SCREEN_OPTIONS.headerShown).toBe(false);
    expect(CREATE_SHEET_SCREEN_OPTIONS.sheetGrabberVisible).toBe(true);
    expect(CREATE_SHEET_SCREEN_OPTIONS.sheetAllowedDetents).toEqual([0.4]);
    expect(CREATE_SHEET_SCREEN_OPTIONS.sheetExpandsWhenScrolledToEdge).toBe(false);
    expect(CREATE_SHEET_SCREEN_OPTIONS.sheetCornerRadius).toBe(FORM_SHEET_CORNER_RADIUS);
    expect(CREATE_SHEET_SCREEN_OPTIONS.contentStyle).toEqual({ height: '100%' });
  });
});

describe('create tab slot vs create sheet route', () => {
  it('keeps the + tab trigger path distinct from the sheet route', () => {
    expect(`/${CREATE_TAB_NAME}`).not.toBe(routes.create);
    expect(routes.create).toBe('/create');
  });
});
