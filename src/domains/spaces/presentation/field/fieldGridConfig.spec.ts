import { describe, expect, it } from 'vitest';

import {
  FIELD_CELL_SIZE_PX,
  FIELD_GRID_CENTER_COLS,
  FIELD_GRID_COLS,
  FIELD_GRID_HEIGHT,
  FIELD_GRID_ROWS,
  FIELD_GRID_SIDE_EXTRA_COLS,
  FIELD_GRID_WIDTH,
  FIELD_MESH_ORIGIN,
  createFieldGridConfig,
  fieldGridWorldSize,
  fieldMeshCenter,
  fieldMeshPlanePosition,
} from './fieldGridConfig';

describe('fieldGridConfig', () => {
  it('expands 10 center cols by 20 on each side (50×15, 60px cells)', () => {
    expect(FIELD_GRID_CENTER_COLS).toBe(10);
    expect(FIELD_GRID_SIDE_EXTRA_COLS).toBe(20);
    expect(FIELD_GRID_COLS).toBe(50);
    expect(FIELD_GRID_ROWS).toBe(15);
    expect(FIELD_CELL_SIZE_PX).toBe(60);
    expect(FIELD_GRID_WIDTH).toBe(3000);
    expect(FIELD_GRID_HEIGHT).toBe(900);
  });

  it('computes world size from config', () => {
    const config = createFieldGridConfig(4, 3, 60);
    expect(fieldGridWorldSize(config)).toEqual({ width: 240, height: 180 });
  });

  it('places mesh left-edge origin at world zero', () => {
    const config = createFieldGridConfig(50, 21, 60);
    expect(FIELD_MESH_ORIGIN).toEqual([0, 0, 0]);
    expect(fieldMeshPlanePosition(config)).toEqual([1500, 0, 0]);
    expect(fieldMeshCenter(config)).toEqual([1500, 0, 0]);
  });

  it('rejects non-positive dimensions', () => {
    expect(() => createFieldGridConfig(0, 10, 60)).toThrow(/positive/i);
    expect(() => createFieldGridConfig(10, -1, 60)).toThrow(/positive/i);
    expect(() => createFieldGridConfig(10, 10, 0)).toThrow(/positive/i);
  });
});
