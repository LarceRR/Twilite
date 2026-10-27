import {
  fieldTileHeight,
  FIELD_TILE_HEIGHT_STEP,
  objectPlatformHeight,
} from './fieldTileGeneration';
import { FIELD_GRID_DIVIDER_WIDTH, fieldGridWorldSize, type FieldGridConfig } from './fieldGridConfig';

/** sqrt(1 / 48 blades per square metre) converted to Twilite world units. */
export const FIELD_GRASS_SPACING = 14.5;

/** Continuous world-space grass instance; grid cells are used only to sample terrain height. */
export type FieldGrassInstance = {
  readonly x: number;
  readonly y: number;
  readonly rootZ: number;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  /** 0 = normal sprite, 1/2 = rare accent variants. */
  readonly accent: number;
};

export type FieldGrassGenerationOptions = {
  readonly chunkIndex: number;
  readonly chunkCols: number;
  readonly grid: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth'>;
  readonly worldSeed: string;
  readonly tileMinHeight: number;
  readonly tileMaxHeight: number;
  readonly platformHeight: number;
  readonly objectMinHeight: number;
  readonly objectMaxHeight: number;
  readonly generatedTilesEnabled: boolean;
  readonly occupiedCellKeys: ReadonlySet<string>;
  readonly spacing?: number;
};

/** Stable hash of the global distribution lattice, independent of chunk boundaries. */
function grassRandom(x: number, y: number, channel: number): number {
  let hash = 0x811c9dc5;
  const value = x + ':' + y + ':' + channel;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return (hash >>> 0) / 0x1_0000_0000;
}

/**
 * Generate a jittered world-space lattice rather than one blade per cell.
 * The lattice uses absolute coordinates, so adjacent streamed chunks share the
 * same pattern and never create a density seam. Cell indices sample the existing
 * tile elevation and provide only a small local clearance around object artwork.
 */
export function generateFieldGrassInstances(
  options: FieldGrassGenerationOptions,
): readonly FieldGrassInstance[] {
  const spacing = options.spacing ?? FIELD_GRASS_SPACING;
  if (
    !Number.isFinite(spacing) ||
    spacing <= 0 ||
    !Number.isInteger(options.chunkIndex) ||
    options.chunkIndex < 0 ||
    !Number.isInteger(options.chunkCols) ||
    options.chunkCols < 1
  ) {
    return [];
  }

  const grid: FieldGridConfig = {
    cols: options.chunkCols,
    rows: options.grid.rows,
    cellSize: options.grid.cellSize,
    dividerWidth: options.grid.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH,
    showDividers: false,
  };
  const { width: chunkWidth, height: surfaceHeight } = fieldGridWorldSize(grid);
  const pitch = options.grid.cellSize + (options.grid.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH);
  const chunkStartX = options.chunkIndex * chunkWidth;
  const chunkEndX = chunkStartX + chunkWidth;
  const halfSurfaceHeight = surfaceHeight / 2;
  const instances: FieldGrassInstance[] = [];

  const firstLatticeX = Math.floor(chunkStartX / spacing) - 1;
  const lastLatticeX = Math.ceil(chunkEndX / spacing) + 1;
  const firstLatticeY = -1;
  const lastLatticeY = Math.ceil(surfaceHeight / spacing) + 1;

  for (let latticeX = firstLatticeX; latticeX <= lastLatticeX; latticeX += 1) {
    for (let latticeY = firstLatticeY; latticeY <= lastLatticeY; latticeY += 1) {
      const positionSeed = grassRandom(latticeX, latticeY, 1);
      const jitterX = (grassRandom(latticeX, latticeY, 2) - 0.5) * 0.98;
      const jitterY = (grassRandom(latticeX, latticeY, 3) - 0.5) * 0.98;
      const x = (latticeX + 0.5 + jitterX) * spacing;
      const y = -halfSurfaceHeight + (latticeY + 0.5 + jitterY) * spacing;

      // Keep roots and blade width inside the finite depth of the existing surface.
      const leftEdgeMargin = options.chunkIndex === 0 ? 12 : 0;
      if (x < chunkStartX + leftEdgeMargin || x >= chunkEndX || y < -halfSurfaceHeight + 12 || y >= halfSurfaceHeight - 12) {
        continue;
      }

      const col = Math.floor(x / pitch);
      const row = Math.floor((halfSurfaceHeight - y) / pitch);
      if (col < 0 || row < 0 || row >= options.grid.rows) continue;

      const isOccupied = options.occupiedCellKeys.has(col + ':' + row);
      if (isOccupied) {
        const centerX = col * pitch + (options.grid.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH) + options.grid.cellSize / 2;
        const centerY = halfSurfaceHeight - (
          row * pitch + (options.grid.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH) + options.grid.cellSize / 2
        );
        // Keep only a small local clearance around the artwork itself. Do not
        // clear the whole logical cell: cells must not be visible in the grass pattern.
        const objectClearance = options.grid.cellSize * 0.28;
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy < objectClearance * objectClearance) continue;
      }

      const rootZ = isOccupied
        ? objectPlatformHeight(
            options.worldSeed,
            col,
            row,
            options.objectMinHeight,
            options.objectMaxHeight,
          )
        : options.generatedTilesEnabled
          ? fieldTileHeight(
              options.worldSeed,
              col,
              row,
              options.tileMinHeight,
              options.tileMaxHeight,
            ) * FIELD_TILE_HEIGHT_STEP
          : -options.platformHeight;

      // Demo.tscn uses a fixed 0.2 × 0.3 m QuadMesh; keep that shape rather
      // than randomly scaling ordinary grass blades.
      const width = 20;
      const height = 30;
      const accentSeed1 = grassRandom(latticeX, latticeY, 6);
      const accentSeed2 = grassRandom(latticeX, latticeY, 7);
      // Match accent_frequency1=0.001 then accent_probability2=0.0001.
      const accent = accentSeed1 < 0.001
        ? 1
        : accentSeed2 < 0.0001
          ? 2
          : 0;

      instances.push({
        x,
        y,
        rootZ,
        width,
        height,
        seed: positionSeed,
        accent,
      });
    }
  }

  return instances;
}
