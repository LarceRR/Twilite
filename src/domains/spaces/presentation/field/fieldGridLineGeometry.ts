import type { FieldGridConfig } from './fieldGridConfig';
import { fieldGridWorldSize } from './fieldGridConfig';

/**
 * Square-cell grid line positions for LineSegments (pairs of xyz).
 * Z-up: deck on XY. Optional `colStart` places the slice on absolute +X.
 */
export function buildFieldGridLinePositions(
  config: FieldGridConfig,
  zLift: number = 0.5,
  colStart: number = 0,
): Float32Array {
  const { width, height } = fieldGridWorldSize(config);
  const halfH = height / 2;
  const originX = colStart * config.cellSize;
  const verts: number[] = [];

  for (let c = 0; c <= config.cols; c += 1) {
    const x = originX + c * config.cellSize;
    verts.push(x, -halfH, zLift, x, halfH, zLift);
  }
  for (let r = 0; r <= config.rows; r += 1) {
    const y = -halfH + r * config.cellSize;
    verts.push(originX, y, zLift, originX + width, y, zLift);
  }

  return new Float32Array(verts);
}

export function fieldGridLineSegmentCount(config: FieldGridConfig): number {
  return config.cols + 1 + (config.rows + 1);
}
