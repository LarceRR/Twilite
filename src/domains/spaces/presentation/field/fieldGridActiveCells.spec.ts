import { describe, expect, it } from 'vitest';

import {
  FIELD_ACTIVE_SIDE_SPAN,
  fieldGridCenterRow,
  fieldGridSideBrightness,
  isActiveFieldGridCell,
} from './fieldGridActiveCells';
import { cellLabelFromColRow } from './fieldGridCells';

describe('fieldGridActiveCells', () => {
  const rows = 15;

  it('picks the middle row for an odd row count', () => {
    expect(fieldGridCenterRow(rows)).toBe(7);
    expect(fieldGridCenterRow(5)).toBe(2);
  });

  it('marks center ±2 as active', () => {
    expect(FIELD_ACTIVE_SIDE_SPAN).toBe(2);
    expect(isActiveFieldGridCell(5, rows)).toBe(true);
    expect(isActiveFieldGridCell(7, rows)).toBe(true);
    expect(isActiveFieldGridCell(9, rows)).toBe(true);
    expect(isActiveFieldGridCell(4, rows)).toBe(false);
    expect(isActiveFieldGridCell(10, rows)).toBe(false);
  });

  it('dims tiles symmetrically from the central row', () => {
    expect(fieldGridSideBrightness(7, rows, 2)).toBe(1);
    expect(fieldGridSideBrightness(6, rows, 2)).toBeCloseTo(0.58);
    expect(fieldGridSideBrightness(8, rows, 2)).toBeCloseTo(0.58);
    expect(fieldGridSideBrightness(5, rows, 2)).toBeCloseTo(0.58 ** 2);
    expect(fieldGridSideBrightness(9, rows, 2)).toBeCloseTo(0.58 ** 2);
    expect(fieldGridSideBrightness(3, rows, 2)).toBeCloseTo(0.58 ** 4);
    expect(fieldGridSideBrightness(0, rows, 2)).toBe(0.1);
    expect(fieldGridSideBrightness(14, rows, 2)).toBe(0.1);
  });

  it('center-row active cells use stable XY labels X2,Y8 X3,Y8 X4,Y8 X5,Y8…', () => {
    const center = fieldGridCenterRow(rows);
    expect(cellLabelFromColRow(1, center)).toBe('X2,Y8');
    expect(cellLabelFromColRow(2, center)).toBe('X3,Y8');
    expect(cellLabelFromColRow(3, center)).toBe('X4,Y8');
    expect(cellLabelFromColRow(4, center)).toBe('X5,Y8');
  });
});
