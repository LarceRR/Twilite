import { describe, expect, it } from 'vitest';

import { createFieldGridConfig } from './fieldGridConfig';
import {
  isWorldPointOnActiveCell,
  worldPointToFieldCell,
} from './fieldGridHitTest';
import { cellCenterOnPlane } from './fieldGridCells';

describe('fieldGridHitTest', () => {
  const config = createFieldGridConfig(50, 21, 60);

  it('maps world points to col/row', () => {
    expect(worldPointToFieldCell(30, 600, config)).toEqual({ col: 0, row: 0 });
    expect(worldPointToFieldCell(2970, -600, config)).toEqual({ col: 49, row: 20 });
    const mid = cellCenterOnPlane(24, 10, config);
    expect(worldPointToFieldCell(mid[0], mid[1], config)).toEqual({ col: 24, row: 10 });
  });

  it('rejects points off the deck', () => {
    expect(worldPointToFieldCell(-1, 0, config)).toBeNull();
    expect(worldPointToFieldCell(10, 900, config)).toBeNull();
  });

  it('allows streamed columns beyond the legacy finite width', () => {
    expect(worldPointToFieldCell(3030, 0, config)).toEqual({ col: 50, row: 10 });
  });

  it('detects the active center band', () => {
    const active = cellCenterOnPlane(5, 10, config);
    const inactive = cellCenterOnPlane(5, 0, config);
    expect(isWorldPointOnActiveCell(active[0], active[1], config)).toBe(true);
    expect(isWorldPointOnActiveCell(inactive[0], inactive[1], config)).toBe(false);
  });
});
