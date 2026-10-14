import type { FieldGridConfig } from './fieldGridConfig';
import {
  FIELD_GRID_DIVIDER_WIDTH,
  fieldGridCellPitch,
  fieldGridWorldSize,
} from './fieldGridConfig';

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
  const pitch = fieldGridCellPitch(config);
  const dividerWidth = config.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH;
  const halfH = height / 2;
  const originX = colStart * pitch;
  const lineInset = dividerWidth / 2;
  const verts: number[] = [];

  for (let c = 0; c <= config.cols; c += 1) {
    const x = originX + lineInset + c * pitch;
    verts.push(x, -halfH, zLift, x, halfH, zLift);
  }
  for (let r = 0; r <= config.rows; r += 1) {
    const y = -halfH + lineInset + r * pitch;
    verts.push(originX, y, zLift, originX + width, y, zLift);
  }

  return new Float32Array(verts);
}

export function fieldGridLineSegmentCount(config: FieldGridConfig): number {
  return config.cols + 1 + (config.rows + 1);
}
