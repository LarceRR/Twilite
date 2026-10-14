import { isActiveFieldGridCell } from './fieldGridActiveCells';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  fieldGridCellPitch,
  fieldGridWorldSize,
} from './fieldGridConfig';

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
  const pitch = fieldGridCellPitch(config);
  const dividerWidth = config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH;
  if (worldX < 0) return null;
  if (worldY < -height / 2 || worldY >= height / 2) return null;
  const col = Math.floor(worldX / pitch);
  const localX = worldX - col * pitch;
  const distanceFromTop = height / 2 - worldY - dividerWidth;
  if (localX < dividerWidth || distanceFromTop < 0) return null;
  const row = Math.floor(distanceFromTop / pitch);
  const localY = distanceFromTop - row * pitch;
  if (col < 0 || row < 0 || row >= config.rows) return null;
  if (localY >= config.cellSize) return null;
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
