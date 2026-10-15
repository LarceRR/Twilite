export type FieldTileHeights = {
  readonly inactiveMinHeight: number;
  readonly inactiveMaxHeight: number;
  readonly activeMinHeight: number;
  readonly activeMaxHeight: number;
};

export type FieldTileVariant = {
  readonly height: number;
  readonly tint: number;
  readonly rotationQuarterTurns: number;
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
 * The requested weighted distribution: most inactive tiles are one unit high,
 * fewer are two, rare tiles are three, and a very small portion sit at ground level.
 */
export function inactiveFieldTileHeight(
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

export function activeFieldTileHeight(
  seed: string,
  col: number,
  row: number,
  minHeight = 6,
  maxHeight = 9,
): number {
  const min = clampInteger(minHeight, 1, 24);
  const max = clampInteger(maxHeight, min, 24);
  const span = max - min + 1;
  return min + Math.floor(fieldTileRandom(seed, col, row, 2) * span);
}

export function fieldTileVariant(
  seed: string,
  col: number,
  row: number,
  isActive: boolean,
  heights: FieldTileHeights,
): FieldTileVariant {
  return {
    height: isActive
      ? activeFieldTileHeight(seed, col, row, heights.activeMinHeight, heights.activeMaxHeight)
      : inactiveFieldTileHeight(seed, col, row, heights.inactiveMinHeight, heights.inactiveMaxHeight),
    tint: 0.91 + fieldTileRandom(seed, col, row, 3) * 0.13,
    rotationQuarterTurns: Math.floor(fieldTileRandom(seed, col, row, 4) * 4),
  };
}

function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;
}
