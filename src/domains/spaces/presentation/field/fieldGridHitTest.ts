import { isActiveFieldGridCell } from './fieldGridActiveCells';
import type { FieldGridConfig } from './fieldGridConfig';
import { fieldGridWorldSize } from './fieldGridConfig';

export type FieldGridCellCoord = {
  readonly col: number;
  readonly row: number;
};

/**
 * Map a world-space point on the deck (z≈0) to a grid cell.
 * X streams infinitely for x≥0; Y stays within the configured row band.
 */
export function worldPointToFieldCell(
  worldX: number,
  worldY: number,
  config: FieldGridConfig,
): FieldGridCellCoord | null {
  const { height } = fieldGridWorldSize(config);
  if (worldX < 0) return null;
  if (worldY < -height / 2 || worldY >= height / 2) return null;
  const col = Math.floor(worldX / config.cellSize);
  const row = Math.floor((height / 2 - worldY) / config.cellSize);
  if (col < 0 || row < 0 || row >= config.rows) return null;
  return { col, row };
}

export function isWorldPointOnActiveCell(
  worldX: number,
  worldY: number,
  config: FieldGridConfig,
): boolean {
  const cell = worldPointToFieldCell(worldX, worldY, config);
  if (cell == null) return false;
  return isActiveFieldGridCell(cell.row, config.rows);
}
