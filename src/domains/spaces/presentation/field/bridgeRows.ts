import { BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

export const BRIDGE_MIN_ROWS = 28;
export const BRIDGE_ROWS_AHEAD = 14;
/** Instance buffers grow in chunks so a new object doesn't rebuild the bridge. */
export const BRIDGE_ROW_CHUNK = 32;

/** Last row index (inclusive) that should be drawn. */
export function visibleBridgeRows(maxRow: number): number {
  return Math.max(BRIDGE_MIN_ROWS, Math.max(0, maxRow) + BRIDGE_ROWS_AHEAD);
}

/** Last row index (inclusive) the instance buffers are allocated for. */
export function bridgeRowCapacity(lastRow: number): number {
  return Math.ceil((Math.max(0, lastRow) + 1) / BRIDGE_ROW_CHUNK) * BRIDGE_ROW_CHUNK - 1;
}

/** Checkerboard split of rows 0..lastRow into even/odd instance counts. */
export function bridgeInstanceCounts(lastRow: number): { even: number; odd: number } {
  let even = 0;
  let odd = 0;
  for (let row = 0; row <= lastRow; row += 1) {
    for (let col = 0; col < BRIDGE_COLUMN_COUNT; col += 1) {
      if ((row + col) % 2 === 0) {
        even += 1;
      } else {
        odd += 1;
      }
    }
  }
  return { even, odd };
}
