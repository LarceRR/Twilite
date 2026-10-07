import { describe, expect, it } from 'vitest';

import {
  FIELD_CELL_LONG_PRESS_MS,
  FIELD_WAVE_SECOND_BURST_GAP_SEC,
  fieldCellLongPressToastMessage,
  fieldCellTapToastMessage,
  resolveActiveFieldCellAtPoint,
  sameFieldCell,
  shouldKeepFieldCellPress,
} from './fieldGridCellPress';
import { cellCenterOnPlane } from './fieldGridCells';
import { createFieldGridConfig } from './fieldGridConfig';

describe('fieldGridCellPress', () => {
  const config = createFieldGridConfig(50, 21, 60);

  it('builds tap and long-press toast copy', () => {
    expect(FIELD_CELL_LONG_PRESS_MS).toBe(330);
    expect(FIELD_WAVE_SECOND_BURST_GAP_SEC).toBeGreaterThan(0);
    expect(fieldCellTapToastMessage('2,11')).toBe('Вы нажали на ячейку 2,11');
    expect(fieldCellLongPressToastMessage('2,11')).toBe('Вы зажали ячейку 2,11');
  });

  it('resolves only active cells under a world point', () => {
    const active = cellCenterOnPlane(1, 10, config);
    const inactive = cellCenterOnPlane(1, 0, config);
    expect(resolveActiveFieldCellAtPoint(active[0], active[1], config)).toEqual({
      col: 1,
      row: 10,
      label: '2,11',
    });
    expect(resolveActiveFieldCellAtPoint(inactive[0], inactive[1], config)).toBeNull();
  });

  it('compares cell coordinates', () => {
    expect(sameFieldCell({ col: 1, row: 2 }, { col: 1, row: 2 })).toBe(true);
    expect(sameFieldCell({ col: 1, row: 2 }, { col: 1, row: 3 })).toBe(false);
    expect(sameFieldCell(null, { col: 0, row: 0 })).toBe(false);
  });

  it('cancels press when the pointer leaves the original cell', () => {
    const pressed = { col: 1, row: 10 };
    expect(shouldKeepFieldCellPress(pressed, { col: 1, row: 10 })).toBe(true);
    expect(shouldKeepFieldCellPress(pressed, { col: 2, row: 10 })).toBe(false);
    expect(shouldKeepFieldCellPress(pressed, null)).toBe(false);
  });
});
