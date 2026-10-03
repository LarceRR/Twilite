import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import type { FieldGridConfig } from './fieldGridConfig';

/** Cells along +X per streamed chunk. */
export const FIELD_CHUNK_COLS = DEFAULT_FIELD_CONFIG.chunks.cols;

/** Chunks kept behind the camera focus. */
export const FIELD_CHUNK_BEHIND = DEFAULT_FIELD_CONFIG.chunks.behind;

/** Chunks kept ahead of the camera focus (new terrain). */
export const FIELD_CHUNK_AHEAD = DEFAULT_FIELD_CONFIG.chunks.ahead;

/**
 * How far ahead of the camera (world +X) we treat as the streaming focus.
 * Keeps chunk 0 loaded at the default camera x≈-469 and gives bake time.
 */
export const FIELD_CHUNK_LOOK_AHEAD_PX = DEFAULT_FIELD_CONFIG.chunks.lookAheadPx;

export type FieldGridChunkSpec = {
  readonly chunkIndex: number;
  readonly colStart: number;
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
};

export function fieldChunkIndexFromWorldX(
  worldX: number,
  cellSize: number,
  chunkCols: number = FIELD_CHUNK_COLS,
): number {
  if (cellSize <= 0 || chunkCols < 1) {
    throw new Error('chunk indexing requires positive cellSize and chunkCols');
  }
  const col = Math.floor(worldX / cellSize);
  return Math.max(0, Math.floor(col / chunkCols));
}

export function fieldChunkFocusWorldX(
  cameraX: number,
  lookAheadPx: number = FIELD_CHUNK_LOOK_AHEAD_PX,
): number {
  return Math.max(0, cameraX + lookAheadPx);
}

export function fieldChunkColStart(
  chunkIndex: number,
  chunkCols: number = FIELD_CHUNK_COLS,
): number {
  return Math.max(0, chunkIndex) * chunkCols;
}

export function fieldVisibleChunkIndices(
  anchorChunk: number,
  behind: number = FIELD_CHUNK_BEHIND,
  ahead: number = FIELD_CHUNK_AHEAD,
): readonly number[] {
  const start = Math.max(0, anchorChunk - behind);
  const end = Math.max(start, anchorChunk + ahead);
  const ids: number[] = [];
  for (let i = start; i <= end; i += 1) ids.push(i);
  return ids;
}

export function fieldChunkIndicesForCameraX(
  cameraX: number,
  cellSize: number,
  chunkCols?: number,
  lookAheadPx?: number,
  behind?: number,
  ahead?: number,
): readonly number[] {
  const chunks = getFieldConfig().chunks;
  const focusX = fieldChunkFocusWorldX(cameraX, lookAheadPx ?? chunks.lookAheadPx);
  const anchor = fieldChunkIndexFromWorldX(
    focusX,
    cellSize,
    chunkCols ?? chunks.cols,
  );
  return fieldVisibleChunkIndices(
    anchor,
    behind ?? chunks.behind,
    ahead ?? chunks.ahead,
  );
}

export function createFieldGridChunkSpec(
  chunkIndex: number,
  base: Pick<FieldGridConfig, 'rows' | 'cellSize'>,
  chunkCols?: number,
): FieldGridChunkSpec {
  const cols = chunkCols ?? getFieldConfig().chunks.cols;
  return {
    chunkIndex,
    colStart: fieldChunkColStart(chunkIndex, cols),
    cols,
    rows: base.rows,
    cellSize: base.cellSize,
  };
}

export function fieldChunkWorldWidth(spec: FieldGridChunkSpec): number {
  return spec.cols * spec.cellSize;
}

export function fieldChunkWorldHeight(spec: FieldGridChunkSpec): number {
  return spec.rows * spec.cellSize;
}

/** Plane center so the chunk covers absolute x∈[colStart*size, (colStart+cols)*size]. */
export function fieldChunkPlanePosition(
  spec: FieldGridChunkSpec,
): readonly [number, number, number] {
  const width = fieldChunkWorldWidth(spec);
  const originX = spec.colStart * spec.cellSize;
  return [originX + width / 2, 0, 0];
}

export function fieldChunkConfigsEqual(
  a: readonly number[],
  b: readonly number[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Slice config used by texture/line bakers (local cols, absolute colStart). */
export function fieldChunkToGridConfig(spec: FieldGridChunkSpec): FieldGridConfig {
  return {
    cols: spec.cols,
    rows: spec.rows,
    cellSize: spec.cellSize,
  };
}
