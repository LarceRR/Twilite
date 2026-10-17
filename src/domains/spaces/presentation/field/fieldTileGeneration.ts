export type FieldTileHeights = {
  readonly tileMinHeight: number;
  readonly tileMaxHeight: number;
};

export type FieldTileVariant = {
  readonly height: number;
};

/** World units of elevation per regular tile height level. */
export const FIELD_TILE_HEIGHT_STEP = 2;
const MAX_CONFIGURED_TILE_HEIGHT = 100;

/** FNV-1a seeded from world coordinates: tile layout stays stable while chunks recycle. */
export function fieldTileRandom(seed: string, col: number, row: number, channel = 0): number {
  let hash = 0x811c9dc5;
  const value = seed + ':' + col + ':' + row + ':' + channel;
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
 * Seeded height distribution for every unoccupied tile, including the spawn band.
 * Every setting can span 0..100. The original four-level range retains its existing
 * weighting; wider ranges use a mild low-height bias and all configured levels.
 */
export function fieldTileHeight(
  seed: string,
  col: number,
  row: number,
  minHeight = 0,
  maxHeight = 3,
): number {
  const [min, max] = normalizeHeightRange(minHeight, maxHeight);
  const sample = fieldTileRandom(seed, col, row, 1);
  const span = max - min + 1;

  if (span <= 4) {
    const weighted = sample < 0.035 ? 0 : sample < 0.755 ? 1 : sample < 0.96 ? 2 : 3;
    return clampInteger(weighted, min, max);
  }

  const lowBiasedSample = Math.pow(sample, 1.35);
  return Math.min(max, min + Math.floor(lowBiasedSample * span));
}

/** Object platforms use their configured range without a forced minimum elevation. */
export function objectPlatformHeight(
  seed: string,
  col: number,
  row: number,
  minHeight = 6,
  maxHeight = 9,
): number {
  const [min, max] = normalizeHeightRange(minHeight, maxHeight);
  const span = max - min + 1;
  return min + Math.floor(fieldTileRandom(seed, col, row, 2) * span);
}

/** Highest top elevation any tile can reach with the current settings. */
export function fieldTileMaxTopHeight(settings: {
  readonly tileMinHeight: number;
  readonly tileMaxHeight: number;
  readonly objectMinHeight: number;
  readonly objectMaxHeight: number;
}): number {
  const [, objectMax] = normalizeHeightRange(
    settings.objectMinHeight,
    settings.objectMaxHeight,
  );
  const [, tileMax] = normalizeHeightRange(settings.tileMinHeight, settings.tileMaxHeight);
  return Math.max(objectMax, tileMax * FIELD_TILE_HEIGHT_STEP);
}

export function fieldTileVariant(
  seed: string,
  col: number,
  row: number,
  heights: FieldTileHeights,
): FieldTileVariant {
  return {
    height: fieldTileHeight(seed, col, row, heights.tileMinHeight, heights.tileMaxHeight),
  };
}

function normalizeHeightRange(first: number, second: number): readonly [number, number] {
  const a = clampInteger(first, 0, MAX_CONFIGURED_TILE_HEIGHT);
  const b = clampInteger(second, 0, MAX_CONFIGURED_TILE_HEIGHT);
  return [Math.min(a, b), Math.max(a, b)];
}

function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
}
