import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  fieldGridCellPitch,
  type FieldGridConfig,
} from './fieldGridConfig';

/** Cells along +X per streamed chunk. */
export const FIELD_CHUNK_COLS = DEFAULT_FIELD_CONFIG.chunks.cols;

/** Chunks kept behind the camera focus. */
export const FIELD_CHUNK_BEHIND = DEFAULT_FIELD_CONFIG.chunks.behind;

/** Chunks kept ahead of the camera focus (new terrain). */
export const FIELD_CHUNK_AHEAD = DEFAULT_FIELD_CONFIG.chunks.ahead;

/**
 * How far ahead of the camera (world +X) we treat as the streaming focus.
 * Keep this below one chunk width so the physical camera chunk is not evicted early.
 */
export const FIELD_CHUNK_LOOK_AHEAD_PX = DEFAULT_FIELD_CONFIG.chunks.lookAheadPx;

export type FieldGridChunkSpec = {
  readonly chunkIndex: number;
  readonly colStart: number;
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly dividerWidth?: number;
  readonly showDividers?: boolean;
};

export function fieldChunkIndexFromWorldX(
  worldX: number,
  cellPitch: number,
  chunkCols: number = FIELD_CHUNK_COLS,
): number {
  if (cellPitch <= 0 || chunkCols < 1) {
    throw new Error('chunk indexing requires positive cellPitch and chunkCols');
  }
  const col = Math.floor(worldX / cellPitch);
  return Math.max(0, Math.floor(col / chunkCols));
}

/**
 * Keep the streaming focus less than one chunk ahead. Otherwise the desired
 * window can move past the physical camera chunk before the camera enters it.
 * This also protects users with a persisted legacy lookAheadPx override.
 */
export function fieldChunkStreamingLookAheadPx(
  lookAheadPx: number,
  cellPitch: number,
  chunkCols: number = FIELD_CHUNK_COLS,
): number {
  if (!Number.isFinite(lookAheadPx)) return 0;
  if (cellPitch <= 0 || chunkCols < 1) {
    throw new Error('chunk look-ahead requires positive cellPitch and chunkCols');
  }
  return Math.min(Math.max(0, lookAheadPx), Math.max(0, cellPitch * chunkCols - 1));
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

/**
 * Stable signature of occupied cells local to a chunk. Changes in other chunks
 * must not invalidate grass/tile work for this chunk.
 */
export function fieldChunkOccupiedCellsSignature(
  chunkIndex: number | null,
  chunkCols: number,
  rows: number,
  occupiedCellKeys: ReadonlySet<string>,
): string {
  if (chunkIndex === null || chunkCols < 1 || rows < 1) return '';

  const firstCol = chunkIndex * chunkCols;
  const occupied: string[] = [];
  for (let localCol = 0; localCol < chunkCols; localCol += 1) {
    const col = firstCol + localCol;
    for (let row = 0; row < rows; row += 1) {
      if (occupiedCellKeys.has(col + ':' + row)) {
        occupied.push(localCol + ':' + row);
      }
    }
  }
  return occupied.join(',');
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
  cellPitch: number,
  chunkCols?: number,
  lookAheadPx?: number,
  behind?: number,
  ahead?: number,
): readonly number[] {
  const chunks = getFieldConfig().chunks;
  const safeLookAhead = fieldChunkStreamingLookAheadPx(
    lookAheadPx ?? chunks.lookAheadPx,
    cellPitch,
    chunkCols ?? chunks.cols,
  );
  const focusX = fieldChunkFocusWorldX(cameraX, safeLookAhead);
  const anchor = fieldChunkIndexFromWorldX(
    focusX,
    cellPitch,
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
  base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth' | 'showDividers'>,
  chunkCols?: number,
): FieldGridChunkSpec {
  const cols = chunkCols ?? getFieldConfig().chunks.cols;
  return {
    chunkIndex,
    colStart: fieldChunkColStart(chunkIndex, cols),
    cols,
    rows: base.rows,
    cellSize: base.cellSize,
    ...(base.dividerWidth === undefined ? {} : { dividerWidth: base.dividerWidth }),
    ...(base.showDividers === undefined ? {} : { showDividers: base.showDividers }),
  };
}

export function fieldChunkWorldWidth(spec: FieldGridChunkSpec): number {
  return spec.cols * fieldGridCellPitch(spec);
}

export function fieldChunkWorldHeight(spec: FieldGridChunkSpec): number {
  return (
    spec.rows * fieldGridCellPitch(spec) +
    (spec.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH)
  );
}

/** Plane center so the chunk covers absolute x∈[colStart*size, (colStart+cols)*size]. */
export function fieldChunkPlanePosition(
  spec: FieldGridChunkSpec,
): readonly [number, number, number] {
  const width = fieldChunkWorldWidth(spec);
  const originX = spec.colStart * fieldGridCellPitch(spec);
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
    ...(spec.dividerWidth === undefined ? {} : { dividerWidth: spec.dividerWidth }),
    ...(spec.showDividers === undefined ? {} : { showDividers: spec.showDividers }),
  };
}
