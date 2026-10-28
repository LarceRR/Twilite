import {
  fieldTileHeight,
  FIELD_TILE_HEIGHT_STEP,
  objectPlatformHeight,
} from './fieldTileGeneration';
import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { FIELD_GRID_DIVIDER_WIDTH, fieldGridWorldSize, type FieldGridConfig } from './fieldGridConfig';

/** Backwards-compatible alias for the persisted default spacing. */
export const FIELD_GRASS_SPACING = DEFAULT_FIELD_CONFIG.grass.spacing;

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
  readonly maxInstances?: number;
  readonly spacing?: number;
  readonly bladeWidth?: number;
  readonly bladeHeight?: number;
  readonly edgeMargin?: number;
  readonly jitterRatio?: number;
  readonly occupiedClearanceRatio?: number;
  readonly accentProbability1?: number;
  readonly accentProbability2?: number;
};

/** Stable occupied-cell input for one chunk, unaffected by objects loading in other chunks. */
export function fieldGrassOccupiedCellKeysSignature(
  occupiedCellKeys: ReadonlySet<string>,
  chunkIndex: number | null,
  chunkCols: number,
): string {
  if (chunkIndex === null || !Number.isInteger(chunkCols) || chunkCols < 1) return '';

  const keys: string[] = [];
  for (const key of occupiedCellKeys) {
    const separator = key.indexOf(':');
    if (separator < 1) continue;
    const col = Number(key.slice(0, separator));
    if (Number.isInteger(col) && col >= 0 && Math.floor(col / chunkCols) === chunkIndex) {
      keys.push(key);
    }
  }
  return keys.sort().join('|');
}

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
export function* iterateFieldGrassInstances(
  options: FieldGrassGenerationOptions,
): Generator<FieldGrassInstance, void, unknown> {
  const grassDefaults = DEFAULT_FIELD_CONFIG.grass;
  const requestedSpacing = options.spacing ?? FIELD_GRASS_SPACING;
  const bladeWidth = options.bladeWidth ?? grassDefaults.bladeWidth;
  const bladeHeight = options.bladeHeight ?? grassDefaults.bladeHeight;
  const edgeMargin = options.edgeMargin ?? grassDefaults.edgeMargin;
  const jitterRatio = options.jitterRatio ?? grassDefaults.jitterRatio;
  const occupiedClearanceRatio =
    options.occupiedClearanceRatio ?? grassDefaults.occupiedClearanceRatio;
  const accentProbability1 =
    options.accentProbability1 ?? grassDefaults.accentProbability1;
  const accentProbability2 =
    options.accentProbability2 ?? grassDefaults.accentProbability2;
  if (
    !Number.isFinite(requestedSpacing) ||
    requestedSpacing <= 0 ||
    !Number.isInteger(options.chunkIndex) ||
    options.chunkIndex < 0 ||
    !Number.isInteger(options.chunkCols) ||
    options.chunkCols < 1
  ) {
    return;
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

  const maxInstances = options.maxInstances == null || !Number.isFinite(options.maxInstances)
    ? Number.POSITIVE_INFINITY
    : Math.max(1, Math.floor(options.maxInstances));

  // Adapt the lattice spacing when the requested density exceeds the GPU
  // budget. Estimate a conservative upper bound from the full chunk dimensions
  // and maximum jitter displacement, so every valid lattice point fits the
  // instance limit without periodic X/Y thinning or visible density bands.
  // The calculation deliberately excludes chunkIndex: neighbouring chunks use
  // the same effective spacing and therefore share one world-aligned lattice.
  let spacing = requestedSpacing;
  if (Number.isFinite(maxInstances)) {
    const horizontalSpan = chunkWidth;
    const verticalSpan = Math.max(0, surfaceHeight - edgeMargin * 2);
    const jitterReach = Math.abs(jitterRatio);
    const maxCandidateCount = (candidateSpacing: number): number => {
      const columns = Math.floor(horizontalSpan / candidateSpacing + jitterReach) + 1;
      const rows = Math.floor(verticalSpan / candidateSpacing + jitterReach) + 1;
      return columns * rows;
    };

    let candidateCount = maxCandidateCount(spacing);
    while (candidateCount > maxInstances) {
      spacing *= Math.max(1.01, Math.sqrt(candidateCount / maxInstances) * 1.01);
      candidateCount = maxCandidateCount(spacing);
    }
  }

  const firstLatticeX = Math.floor(chunkStartX / spacing) - 1;
  const lastLatticeX = Math.ceil(chunkEndX / spacing) + 1;
  const firstLatticeY = -1;
  const lastLatticeY = Math.ceil(surfaceHeight / spacing) + 1;
  const latticeColumns = lastLatticeX - firstLatticeX + 1;
  const latticeRows = lastLatticeY - firstLatticeY + 1;
  const latticeCount = latticeColumns * latticeRows;

  // A chunk can contain thousands of blades. Do not emit them in X-major order:
  // early batches would occupy only a narrow depth strip. A deterministic
  // coprime permutation visits the same world-aligned lattice in a spatially
  // distributed order, so partial buffers already cover the whole chunk.
  const greatestCommonDivisor = (left: number, right: number): number => {
    let a = left;
    let b = right;
    while (b !== 0) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }
    return a;
  };
  let latticeStride = Math.max(1, Math.floor(latticeCount / 3));
  let strideSearches = 0;
  while (
    (
      greatestCommonDivisor(latticeStride, latticeCount) !== 1 ||
      greatestCommonDivisor(Math.floor(latticeStride / latticeColumns), latticeRows) !== 1 ||
      greatestCommonDivisor(latticeStride % latticeColumns, latticeColumns) !== 1
    ) &&
    strideSearches < latticeCount
  ) {
    latticeStride += 1;
    if (latticeStride >= latticeCount) latticeStride = 1;
    strideSearches += 1;
  }
  // A unit stride is always a valid permutation fallback if a degenerate
  // lattice shape has no stride satisfying both axis-distribution constraints.
  if (greatestCommonDivisor(latticeStride, latticeCount) !== 1) latticeStride = 1;
  const latticeStart = Math.floor(
    grassRandom(options.chunkIndex, latticeCount, 8) * latticeCount,
  );

  for (let sequenceIndex = 0; sequenceIndex < latticeCount; sequenceIndex += 1) {
    const latticeIndex = (latticeStart + sequenceIndex * latticeStride) % latticeCount;
    const latticeX = firstLatticeX + (latticeIndex % latticeColumns);
    const latticeY = firstLatticeY + Math.floor(latticeIndex / latticeColumns);
    const positionSeed = grassRandom(latticeX, latticeY, 1);
    const jitterX = (grassRandom(latticeX, latticeY, 2) - 0.5) * jitterRatio;
    const jitterY = (grassRandom(latticeX, latticeY, 3) - 0.5) * jitterRatio;
    const x = (latticeX + 0.5 + jitterX) * spacing;
    const y = -halfSurfaceHeight + (latticeY + 0.5 + jitterY) * spacing;

    // Keep roots and blade width inside the finite depth of the existing surface.
    const leftEdgeMargin = options.chunkIndex === 0 ? edgeMargin : 0;
    if (x < chunkStartX + leftEdgeMargin || x >= chunkEndX || y < -halfSurfaceHeight + edgeMargin || y >= halfSurfaceHeight - edgeMargin) {
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
      const objectClearance = options.grid.cellSize * occupiedClearanceRatio;
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

    const accentSeed1 = grassRandom(latticeX, latticeY, 6);
    const accentSeed2 = grassRandom(latticeX, latticeY, 7);
    const accent = accentSeed1 < accentProbability1
      ? 1
      : accentSeed2 < accentProbability2
        ? 2
        : 0;

    yield {
      x,
      y,
      rootZ,
      width: bladeWidth,
      height: bladeHeight,
      seed: positionSeed,
      accent,

    };
  }

}

/** Convenience wrapper retained for deterministic unit tests and tooling. */
export function generateFieldGrassInstances(
  options: FieldGrassGenerationOptions,
): readonly FieldGrassInstance[] {
  return Array.from(iterateFieldGrassInstances(options));
}
