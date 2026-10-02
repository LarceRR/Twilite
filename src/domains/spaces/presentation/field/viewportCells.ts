import type { PerspectiveCamera } from 'three';

import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import { BRIDGE_DECK_Y, bridgeDeckCellCorners, type DeckCorner } from './bridgeDeckGeometry';
import { transformPoint, viewPolygonOverlapsViewport } from './viewportCellOverlap';

export const VIEWPORT_CELL_HIGHLIGHT = '#fdba2f';
export const VIEWPORT_CELL_HIGHLIGHT_OPACITY = 0.5;
export const VIEWPORT_CELL_HIGHLIGHT_Y = BRIDGE_DECK_Y + 0.001;

export type ViewportCell = {
  readonly column: number;
  readonly row: number;
};

export function listViewportCells(
  rowCount: number,
  baseCompression: number,
  endCompression: number,
  camera: PerspectiveCamera,
): readonly ViewportCell[] {
  const rows = Math.max(1, Math.floor(rowCount));
  const cells: ViewportCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < BRIDGE_COLUMN_COUNT; column += 1) {
      const corners = bridgeDeckCellCorners(column, row, baseCompression, endCompression, rows);
      if (!cellCornersOverlapCamera(corners, camera)) continue;
      cells.push({ column, row });
    }
  }
  return cells;
}

export function cellCornersOverlapCamera(
  corners: readonly DeckCorner[],
  camera: PerspectiveCamera,
): boolean {
  const view = corners.map((corner) => transformPoint(camera.matrixWorldInverse.elements, corner));
  return viewPolygonOverlapsViewport(
    view,
    camera.near,
    camera.far,
    camera.projectionMatrix.elements,
  );
}

export function viewportHighlightCapacity(rowCount: number): number {
  return Math.max(1, Math.floor(rowCount)) * BRIDGE_COLUMN_COUNT;
}

export function buildViewportHighlightPositions(
  cells: readonly ViewportCell[],
  baseCompression: number,
  endCompression: number,
  rowCount: number,
): Float32Array {
  const positions = new Float32Array(cells.length * 12);
  cells.forEach((cell, index) => {
    writeHighlightCell(positions, index, cell, baseCompression, endCompression, rowCount);
  });
  return positions;
}

export function buildViewportHighlightIndices(cellCount: number): Uint16Array {
  const indices = new Uint16Array(cellCount * 6);
  for (let cell = 0; cell < cellCount; cell += 1) {
    const base = cell * 4;
    const offset = cell * 6;
    indices[offset] = base;
    indices[offset + 1] = base + 1;
    indices[offset + 2] = base + 2;
    indices[offset + 3] = base;
    indices[offset + 4] = base + 2;
    indices[offset + 5] = base + 3;
  }
  return indices;
}

function writeHighlightCell(
  positions: Float32Array,
  index: number,
  cell: ViewportCell,
  baseCompression: number,
  endCompression: number,
  rowCount: number,
): void {
  const corners = bridgeDeckCellCorners(
    cell.column,
    cell.row,
    baseCompression,
    endCompression,
    rowCount,
  );
  const offset = index * 12;
  writeHighlightVertex(positions, offset, corners[0]);
  writeHighlightVertex(positions, offset + 3, corners[1]);
  writeHighlightVertex(positions, offset + 6, corners[2]);
  writeHighlightVertex(positions, offset + 9, corners[3]);
}

function writeHighlightVertex(positions: Float32Array, offset: number, corner: DeckCorner): void {
  positions[offset] = corner.x;
  positions[offset + 1] = VIEWPORT_CELL_HIGHLIGHT_Y;
  positions[offset + 2] = corner.z;
}
