export type FieldTileHeights = {
  readonly tileMinHeight: number;
  readonly tileMaxHeight: number;
};

export type FieldTileVariant = {
  readonly height: number;
};

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
 * Shared height distribution for every unoccupied tile, including the five-row
 * spawn band. "Active" only marks eligible object positions; it does not affect height.
 */
export function fieldTileHeight(
  seed: string,
  col: number,
  row: number,
  minHeight = 0,
  maxHeight = 3,
): number {
  const min = clampInteger(minHeight, 0, 3);
  const max = clampInteger(maxHeight, min, 3);
  const sample = fieldTileRandom(seed, col, row, 1);
  const weighted = sample < 0.035 ? 0 : sample < 0.755 ? 1 : sample < 0.96 ? 2 : 3;
  return clampInteger(weighted, min, max);
}

/** Object platforms always use a range higher than the maximum regular tile height. */
export function objectPlatformHeight(
  seed: string,
  col: number,
  row: number,
  minHeight = 6,
  maxHeight = 9,
): number {
  const min = clampInteger(minHeight, 4, 24);
  const max = clampInteger(maxHeight, min, 24);
  const span = max - min + 1;
  return min + Math.floor(fieldTileRandom(seed, col, row, 2) * span);
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

function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
}
