import type { Cell } from '@/domains/surface-objects/domain/value-objects/Cell';

import { BRIDGE_CENTER_COLUMN, BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

/** Square cells on the bridge (world units). */
export const FIELD_CELL_SIZE = 1;

export const FIELD_PLATFORM_Y = 0;

export function clampBridgeColumn(column: number): number {
  return Math.min(BRIDGE_COLUMN_COUNT - 1, Math.max(0, column));
}

/** World position at the center of a bridge cell (floor plane). */
export function bridgeCellToWorld(cell: Cell): { readonly x: number; readonly y: number; readonly z: number } {
  const column = clampBridgeColumn(cell.x);
  return {
    x: (column - BRIDGE_CENTER_COLUMN) * FIELD_CELL_SIZE,
    y: FIELD_PLATFORM_Y,
    z: -cell.y * FIELD_CELL_SIZE,
  };
}
