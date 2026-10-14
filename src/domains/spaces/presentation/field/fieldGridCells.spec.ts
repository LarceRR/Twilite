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

  it('labels cells as 1-based X,Y coordinates (col→X, row→Y)', () => {
    const cells = createFieldGridCells(config);
    expect(cells).toHaveLength(1050);
    expect(cells[0]).toMatchObject({ col: 0, row: 0, index: 0, label: 'X1,Y1' });
    expect(cells[20]).toMatchObject({ col: 0, row: 20, index: 20, label: 'X1,Y21' });
    expect(cells[21]).toMatchObject({ col: 1, row: 0, index: 21, label: 'X2,Y1' });
    expect(cells[1049]).toMatchObject({ col: 49, row: 20, index: 1049, label: 'X50,Y21' });
  });

  it('places col 0 near the camera (−X side) and row 0 on screen-left (+Y)', () => {
    expect(cellIndex(3, 2, 21)).toBe(65);
    expect(cellLabelFromColRow(3, 2)).toBe('X4,Y3');
    expect(cellCenterOnPlane(0, 0, config)).toEqual([31, 610, 0]);
    expect(cellCenterOnPlane(49, 20, config)).toEqual([3020, -610, 0]);
    expect(cellCenterOnPlane(24, 10, config)).toEqual([1495, 0, 0]);
  });

  it('renders backend zero-based cell (2, 7) as the visible label X3,Y8', () => {
    const backendCell = { x: 2, y: 7 };

    expect(cellLabelFromColRow(backendCell.x, backendCell.y)).toBe('X3,Y8');
    expect(cellCenterOnPlane(backendCell.x, backendCell.y, config)).toEqual([153, 183, 0]);
  });
});
