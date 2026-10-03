import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import { isActiveFieldGridCell } from './fieldGridActiveCells';
import { cellLabelFromColRow } from './fieldGridCells';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  worldPointToFieldCell,
  type FieldGridCellCoord,
} from './fieldGridHitTest';

/** Hold duration before a press becomes a long-press. */
export const FIELD_CELL_LONG_PRESS_MS = DEFAULT_FIELD_CONFIG.press.longPressMs;

/** Delay between the two waves fired on long-press. */
export const FIELD_WAVE_SECOND_BURST_GAP_SEC =
  DEFAULT_FIELD_CONFIG.press.secondBurstGapSec;

export function fieldCellTapToastMessage(label: string): string {
  return `Вы нажали на ячейку ${label}`;
}

export function fieldCellLongPressToastMessage(label: string): string {
  return `Вы зажали ячейку ${label}`;
}

export function resolveActiveFieldCellAtPoint(
  worldX: number,
  worldY: number,
  config: FieldGridConfig,
): (FieldGridCellCoord & { readonly label: string }) | null {
  const cell = worldPointToFieldCell(worldX, worldY, config);
  if (cell == null || !isActiveFieldGridCell(cell.row, config.rows)) return null;
  return {
    ...cell,
    label: cellLabelFromColRow(cell.col, cell.row),
  };
}

export function sameFieldCell(
  a: FieldGridCellCoord | null,
  b: FieldGridCellCoord | null,
): boolean {
  if (a == null || b == null) return false;
  return a.col === b.col && a.row === b.row;
}

/** Long-press stays valid only while the pointer remains on the pressed cell. */
export function shouldKeepFieldCellPress(
  pressed: FieldGridCellCoord,
  current: FieldGridCellCoord | null,
): boolean {
  return sameFieldCell(pressed, current);
}

export function fieldCellLongPressMs(): number {
  return getFieldConfig().press.longPressMs;
}

export function fieldWaveSecondBurstGapSec(): number {
  return getFieldConfig().press.secondBurstGapSec;
}
