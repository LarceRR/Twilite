import { fieldTileHeight, FIELD_TILE_HEIGHT_STEP } from './fieldTileGeneration';
import { fieldGridWorldSize, type FieldGridConfig } from './fieldGridConfig';

export const FIELD_GRASS_SPACING = 12.5;

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
 * same pattern and never create a density seam. Cell indices only sample the
 * already-existing tile elevation and keep grass off occupied memory platforms.
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
    dividerWidth: options.grid.dividerWidth,
    showDividers: false,
  };
  const { width: chunkWidth, height: surfaceHeight } = fieldGridWorldSize(grid);
  const pitch = options.grid.cellSize + options.grid.dividerWidth;
  const chunkStartX = options.chunkIndex * chunkWidth;
  const chunkEndX = chunkStartX + chunkWidth;
  const halfSurfaceHeight = surfaceHeight / 2;
  const tileColumnCount = Math.max(1, Math.ceil(chunkWidth / spacing) + 4);
  const tileRowCount = Math.max(1, Math.ceil(surfaceHeight / spacing) + 4);
  const capacityHint = tileColumnCount * tileRowCount;
  const instances: FieldGrassInstance[] = [];
  instances.length = 0;
  void capacityHint;

  const firstLatticeX = Math.floor(chunkStartX / spacing) - 1;
  const lastLatticeX = Math.ceil(chunkEndX / spacing) + 1;
  const firstLatticeY = -1;
  const lastLatticeY = Math.ceil(surfaceHeight / spacing) + 1;

  for (let latticeX = firstLatticeX; latticeX <= lastLatticeX; latticeX += 1) {
    for (let latticeY = firstLatticeY; latticeY <= lastLatticeY; latticeY += 1) {
      const positionSeed = grassRandom(latticeX, latticeY, 1);
      const jitterX = (grassRandom(latticeX, latticeY, 2) - 0.5) * 0.72;
      const jitterY = (grassRandom(latticeX, latticeY, 3) - 0.5) * 0.72;
      const x = (latticeX + 0.5 + jitterX) * spacing;
      const y = -halfSurfaceHeight + (latticeY + 0.5 + jitterY) * spacing;

      // Keep roots and blade width inside the finite depth of the existing surface.
      if (x < chunkStartX || x >= chunkEndX || y < -halfSurfaceHeight + 11 || y >= halfSurfaceHeight - 11) {
        continue;
      }

      const col = Math.floor(x / pitch);
      const row = Math.floor((halfSurfaceHeight - y) / pitch);
      if (col < 0 || row < 0 || row >= options.grid.rows) continue;

      // Twilite objects keep their existing cell footprint unobscured. The rest
      // of the field is populated continuously, unrelated to cell centres.
      if (options.occupiedCellKeys.has(col + ':' + row)) continue;

      const rootZ = options.generatedTilesEnabled
        ? fieldTileHeight(
            options.worldSeed,
            col,
            row,
            options.tileMinHeight,
            options.tileMaxHeight,
          ) * FIELD_TILE_HEIGHT_STEP
        : -options.platformHeight;

      const sizeRandom = grassRandom(latticeX, latticeY, 4);
      const width = 16 + sizeRandom * 8;
      const height = 25 + grassRandom(latticeX, latticeY, 5) * 10;
      const accentRandom = grassRandom(latticeX, latticeY, 6);
      const accent = accentRandom < 0.0001
        ? 2
        : accentRandom < 0.0011
          ? 1
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
