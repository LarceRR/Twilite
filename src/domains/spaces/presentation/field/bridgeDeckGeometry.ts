import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

import { BRIDGE_HALF_WIDTH, FIELD_CELL_SIZE, surfaceRowScale } from './fieldLayout';

export const BRIDGE_DECK_Y = -0.012;

export type DeckCorner = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type BridgeDeckBuffers = {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint16Array | Uint32Array;
  readonly rowCount: number;
  readonly columnCount: number;
};

/**
 * One quad per cell. Corners follow the taper, and every vertex of a cell
 * shares that cell's texel center so the checker cannot kink along a diagonal.
 */
export function buildTaperedBridgeDeck(
  baseCompression: number,
  endCompression: number,
  rowCount: number,
): BridgeDeckBuffers {
  const rows = Math.max(1, Math.floor(rowCount));
  const cellCount = rows * BRIDGE_COLUMN_COUNT;
  const positions = new Float32Array(cellCount * 12);
  const uvs = new Float32Array(cellCount * 8);
  const indices = createCellIndexArray(cellCount);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < BRIDGE_COLUMN_COUNT; column += 1) {
      writeDeckCell(positions, uvs, indices, rows, row, column, baseCompression, endCompression);
    }
  }

  return {
    positions,
    uvs,
    indices,
    rowCount: rows,
    columnCount: BRIDGE_COLUMN_COUNT,
  };
}

/** Near-left, near-right, far-right, far-left. Side fractions stay constant along the taper. */
export function bridgeDeckCellCorners(
  column: number,
  row: number,
  baseCompression: number,
  endCompression: number,
  rowCount: number,
): readonly [DeckCorner, DeckCorner, DeckCorner, DeckCorner] {
  const rows = Math.max(1, Math.floor(rowCount));
  const halfNear = rowHalfWidth(row - 0.5, baseCompression, endCompression, rows);
  const halfFar = rowHalfWidth(row + 0.5, baseCompression, endCompression, rows);
  const zNear = -(row - 0.5) * FIELD_CELL_SIZE;
  const zFar = -(row + 0.5) * FIELD_CELL_SIZE;
  return [
    { x: columnEdgeX(column, halfNear), y: BRIDGE_DECK_Y, z: zNear },
    { x: columnEdgeX(column + 1, halfNear), y: BRIDGE_DECK_Y, z: zNear },
    { x: columnEdgeX(column + 1, halfFar), y: BRIDGE_DECK_Y, z: zFar },
    { x: columnEdgeX(column, halfFar), y: BRIDGE_DECK_Y, z: zFar },
  ];
}

export function bridgeDeckCellUv(
  column: number,
  row: number,
  rowCount: number,
): { readonly u: number; readonly v: number } {
  const rows = Math.max(1, Math.floor(rowCount));
  return {
    u: (column + 0.5) / BRIDGE_COLUMN_COUNT,
    v: (row + 0.5) / rows,
  };
}

export function deckNearHalfWidth(baseCompression: number, endCompression: number): number {
  return rowHalfWidth(-0.5, baseCompression, endCompression, 1);
}

export function deckFarHalfWidth(
  baseCompression: number,
  endCompression: number,
  rowCount: number,
): number {
  const rows = Math.max(1, Math.floor(rowCount));
  return rowHalfWidth(rows - 0.5, baseCompression, endCompression, rows);
}

function rowHalfWidth(
  row: number,
  baseCompression: number,
  endCompression: number,
  rowCount: number,
): number {
  return BRIDGE_HALF_WIDTH * surfaceRowScale(row, baseCompression, endCompression, rowCount);
}

function columnEdgeX(columnEdge: number, halfWidth: number): number {
  return -halfWidth + (columnEdge / BRIDGE_COLUMN_COUNT) * 2 * halfWidth;
}

function createCellIndexArray(cellCount: number): Uint16Array | Uint32Array {
  const indexCount = cellCount * 6;
  if (cellCount * 4 > 65535) return new Uint32Array(indexCount);
  return new Uint16Array(indexCount);
}

function writeDeckCell(
  positions: Float32Array,
  uvs: Float32Array,
  indices: Uint16Array | Uint32Array,
  rows: number,
  row: number,
  column: number,
  baseCompression: number,
  endCompression: number,
): void {
  const cellIndex = row * BRIDGE_COLUMN_COUNT + column;
  const corners = bridgeDeckCellCorners(column, row, baseCompression, endCompression, rows);
  writeCellPositions(positions, cellIndex, corners);
  writeCellUv(uvs, cellIndex, bridgeDeckCellUv(column, row, rows));
  writeQuadIndices(indices, cellIndex);
}

function writeCellPositions(
  positions: Float32Array,
  cellIndex: number,
  corners: readonly [DeckCorner, DeckCorner, DeckCorner, DeckCorner],
): void {
  const offset = cellIndex * 12;
  writeVertex(positions, offset, corners[0]);
  writeVertex(positions, offset + 3, corners[1]);
  writeVertex(positions, offset + 6, corners[2]);
  writeVertex(positions, offset + 9, corners[3]);
}

function writeVertex(positions: Float32Array, offset: number, corner: DeckCorner): void {
  positions[offset] = corner.x;
  positions[offset + 1] = corner.y;
  positions[offset + 2] = corner.z;
}

function writeCellUv(
  uvs: Float32Array,
  cellIndex: number,
  uv: { readonly u: number; readonly v: number },
): void {
  const offset = cellIndex * 8;
  for (let vertex = 0; vertex < 4; vertex += 1) {
    uvs[offset + vertex * 2] = uv.u;
    uvs[offset + vertex * 2 + 1] = uv.v;
  }
}

function writeQuadIndices(indices: Uint16Array | Uint32Array, cellIndex: number): void {
  const base = cellIndex * 4;
  const offset = cellIndex * 6;
  indices[offset] = base;
  indices[offset + 1] = base + 1;
  indices[offset + 2] = base + 2;
  indices[offset + 3] = base;
  indices[offset + 4] = base + 2;
  indices[offset + 5] = base + 3;
}
