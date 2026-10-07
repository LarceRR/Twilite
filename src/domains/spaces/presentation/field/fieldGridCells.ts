import type { FieldGridConfig } from './fieldGridConfig';
import { fieldGridWorldSize } from './fieldGridConfig';

export type FieldGridCell = {
  readonly col: number;
  readonly row: number;
  /** Zero-based index: along Y within each X strip (camera LTR rows). */
  readonly index: number;
  /** Human-readable 1-based XY label (`x,y`). */
  readonly label: string;
  /** World-space center on the XY ground plane (z = 0). */
  readonly center: readonly [number, number, number];
};

/** 1-based world XY label: col→X, row→Y → `"1,1"`, `"1,2"`, `"2,3"`, … */
export function cellLabelFromColRow(col: number, row: number): string {
  return `${col + 1},${row + 1}`;
}

/**
 * Camera looks from −X: screen-right is −Y, screen-up on the deck is +X.
 * Number across +Y→−Y (row) first, then next strip at higher X (col).
 */
export function cellIndex(col: number, row: number, rows: number): number {
  return col * rows + row;
}

/**
 * Left-edge origin at world (0,0,0): col 0 at x≈0 (near camera).
 * Row 0 is the +Y edge (screen-left from the default camera).
 */
export function cellCenterOnPlane(
  col: number,
  row: number,
  config: FieldGridConfig,
): readonly [number, number, number] {
  const { height } = fieldGridWorldSize(config);
  const x = (col + 0.5) * config.cellSize;
  const y = height / 2 - (row + 0.5) * config.cellSize;
  return [x, y, 0];
}

/**
 * Build cells for a grid slice.
 * `colStart` shifts absolute world/label columns while `config.cols` is the slice width.
 */
export function createFieldGridCells(
  config: FieldGridConfig,
  colStart: number = 0,
): readonly FieldGridCell[] {
  const cells: FieldGridCell[] = [];
  for (let localCol = 0; localCol < config.cols; localCol += 1) {
    const col = colStart + localCol;
    for (let row = 0; row < config.rows; row += 1) {
      const index = cellIndex(col, row, config.rows);
      cells.push({
        col,
        row,
        index,
        label: cellLabelFromColRow(col, row),
        center: cellCenterOnPlane(col, row, config),
      });
    }
  }
  return cells;
}
