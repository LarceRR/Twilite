import { describe, expect, it } from 'vitest';

import {
  cellCenterOnPlane,
  cellIndex,
  cellLabelFromColRow,
  createFieldGridCells,
} from './fieldGridCells';
import { createFieldGridConfig } from './fieldGridConfig';

describe('fieldGridCells', () => {
  const config = createFieldGridConfig(50, 21, 60);

  it('labels cells as 1-based x,y (col→X, row→Y)', () => {
    const cells = createFieldGridCells(config);
    expect(cells).toHaveLength(1050);
    expect(cells[0]).toMatchObject({ col: 0, row: 0, index: 0, label: '1,1' });
    expect(cells[20]).toMatchObject({ col: 0, row: 20, index: 20, label: '1,21' });
    expect(cells[21]).toMatchObject({ col: 1, row: 0, index: 21, label: '2,1' });
    expect(cells[1049]).toMatchObject({ col: 49, row: 20, index: 1049, label: '50,21' });
  });

  it('places col 0 near the camera (−X side) and row 0 on screen-left (+Y)', () => {
    expect(cellIndex(3, 2, 21)).toBe(65);
    expect(cellLabelFromColRow(3, 2)).toBe('4,3');
    expect(cellCenterOnPlane(0, 0, config)).toEqual([30, 600, 0]);
    expect(cellCenterOnPlane(49, 20, config)).toEqual([2970, -600, 0]);
    expect(cellCenterOnPlane(24, 10, config)).toEqual([1470, 0, 0]);
  });
});
