import type { Cell } from '@/domains/surface-objects/domain/value-objects/Cell';

import { BRIDGE_CENTER_COLUMN, BRIDGE_COLUMN_COUNT } from '@/domains/surfaces/domain/services/spawnBridgeRow';

/** Square cells on the bridge (world units). */
export const FIELD_CELL_SIZE = 1;

export const FIELD_PLATFORM_Y = 0;

/** Deck is at least this long so the taper is the whole bridge, not a short neck. */
export const BRIDGE_DECK_MIN_ROWS = 28;

/**
 * How hard compression pulls width: scale = 1 - compression * strength.
 * compression 1 → 0.45 (saved “100%” framing); negative expands.
 */
export const SURFACE_SCALE_STRENGTH = 0.55;

/** Soft floor so the bridge never collapses to a line. */
export const SURFACE_SCALE_MIN = 0.02;

/** Half-width of the natural (uncompressed) bridge in world units. */
export const BRIDGE_HALF_WIDTH = (BRIDGE_COLUMN_COUNT * FIELD_CELL_SIZE) / 2;

export function clampBridgeColumn(column: number): number {
  return Math.min(BRIDGE_COLUMN_COUNT - 1, Math.max(0, column));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Width factor for a compression value (negative expands, positive squeezes). */
export function compressionToScale(compression: number): number {
  return Math.max(SURFACE_SCALE_MIN, 1 - compression * SURFACE_SCALE_STRENGTH);
}

/** How many deck rows the taper covers (the whole visible bridge). */
export function visibleBridgeRows(maxRow: number): number {
  return Math.max(BRIDGE_DECK_MIN_ROWS, Math.floor(maxRow) + 14);
}

/**
 * Linear 0 at the near edge (row -0.5) → 1 at the far edge (row = span - 0.5).
 * Straight rails: «Конец» is the far tip, not a late hammer head.
 */
export function surfaceRowBlend(row: number, spanRows: number): number {
  const span = Math.max(spanRows, 1);
  return clamp01((row + 0.5) / span);
}

export function surfaceRowScale(
  row: number,
  baseCompression: number,
  endCompression: number,
  spanRows: number,
): number {
  const w = surfaceRowBlend(row, spanRows);
  const base = compressionToScale(baseCompression);
  const end = compressionToScale(endCompression);
  return base + (end - base) * w;
}

/** World position at the center of a bridge cell (floor plane), natural size. */
export function bridgeCellToWorld(cell: Cell): {
  readonly x: number;
  readonly y: number;
  readonly z: number;
} {
  const column = clampBridgeColumn(cell.x);
  return {
    x: (column - BRIDGE_CENTER_COLUMN) * FIELD_CELL_SIZE,
    y: FIELD_PLATFORM_Y,
    z: -cell.y * FIELD_CELL_SIZE,
  };
}

/**
 * Cell-center after base/end width taper (X only).
 * Sprites use this for placement but keep their own unscaled mesh size.
 */
export function bridgeCellToScaledWorld(
  cell: Cell,
  baseCompression: number,
  endCompression: number,
  spanRows: number,
): { readonly x: number; readonly y: number; readonly z: number } {
  const world = bridgeCellToWorld(cell);
  const scale = surfaceRowScale(cell.y, baseCompression, endCompression, spanRows);
  return {
    x: world.x * scale,
    y: world.y,
    z: world.z,
  };
}
