import {
  DEFAULT_FIELD_CONFIG,
  fieldGridColsFromConfig,
  fieldGridHeightFromConfig,
  fieldGridWidthFromConfig,
} from './fieldConfig';

/** Logical pixel size of one field cell in world units (1 unit = 1 px; 100 units = 1 m for lighting). */
export const FIELD_CELL_SIZE_PX = DEFAULT_FIELD_CONFIG.grid.cellSizePx;
export const FIELD_GRID_DIVIDER_WIDTH = DEFAULT_FIELD_CONFIG.grid.dividerWidthPx;

/** Original center band width before side expansion. */
export const FIELD_GRID_CENTER_COLS = DEFAULT_FIELD_CONFIG.grid.centerCols;

/** Extra columns added on each horizontal side (left and right). */
export const FIELD_GRID_SIDE_EXTRA_COLS = DEFAULT_FIELD_CONFIG.grid.sideExtraCols;

/** Number of cells along X (columns): center + 20 left + 20 right. */
export const FIELD_GRID_COLS = fieldGridColsFromConfig(DEFAULT_FIELD_CONFIG.grid);

/** Number of cells along Y (rows) on the ground plane. */
export const FIELD_GRID_ROWS = DEFAULT_FIELD_CONFIG.grid.rows;

export const FIELD_GRID_WIDTH = fieldGridWidthFromConfig(DEFAULT_FIELD_CONFIG.grid);
export const FIELD_GRID_HEIGHT = fieldGridHeightFromConfig(DEFAULT_FIELD_CONFIG.grid);

/**
 * Field uses Z-up (engineering / CAD style):
 * - X right, Y depth on the ground, Z up
 * - deck lies on the XY plane
 */
export const FIELD_WORLD_UP: readonly [number, number, number] = [0, 0, 1];


/** Render transparent grid/light effects before sprite artwork. */
export const FIELD_GRID_OVERLAY_RENDER_ORDER = 0;

/** Keep pixel-art sprites above grid and glow overlays. */
export const FIELD_OBJECT_ARTWORK_RENDER_ORDER = 2;

export type FieldGridConfig = {
  readonly cols: number;
  readonly rows: number;
  /** Interior cell dimension, excluding the divider at its boundary. */
  readonly cellSize: number;
  readonly dividerWidth?: number;
  /** Whether to draw visual divider lines, independent of the grid's cell pitch. */
  readonly showDividers?: boolean;
};

export function createFieldGridConfig(
  cols: number = FIELD_GRID_COLS,
  rows: number = FIELD_GRID_ROWS,
  cellSize: number = FIELD_CELL_SIZE_PX,
  dividerWidth: number = FIELD_GRID_DIVIDER_WIDTH,
  showDividers: boolean = true,
): FieldGridConfig {
  if (
    cols < 1 ||
    rows < 1 ||
    cellSize <= 0 ||
    !Number.isInteger(dividerWidth) ||
    dividerWidth < 0
  ) {
    throw new Error('Field grid config must use positive cols, rows, and cellSize');
  }
  return { cols, rows, cellSize, dividerWidth, showDividers };
}

export function fieldGridCellPitch(
  config: Pick<FieldGridConfig, 'cellSize' | 'dividerWidth'>,
): number {
  return config.cellSize + (config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH);
}

export function fieldGridWorldSize(config: FieldGridConfig): {
  readonly width: number;
  readonly height: number;
} {
  const pitch = fieldGridCellPitch(config);
  return {
    width: config.cols * pitch,
    height: config.rows * pitch + (config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH),
  };
}

/**
 * Mesh origin = center of the left edge.
 * Width uses cell pitch; height also reserves the final divider row.
 */
export const FIELD_MESH_ORIGIN: readonly [number, number, number] = [0, 0, 0];

/** PlaneGeometry is XY-centered; shift so its left-edge center hits mesh origin. */
export function fieldMeshPlanePosition(
  config: FieldGridConfig,
): readonly [number, number, number] {
  const { width } = fieldGridWorldSize(config);
  return [width / 2, 0, 0];
}

/** Geometric center of the deck (for camera look-at). */
export function fieldMeshCenter(
  config: FieldGridConfig,
): readonly [number, number, number] {
  const { width } = fieldGridWorldSize(config);
  return [width / 2, 0, 0];
}
