import type { Cell } from '@/domains/surface-objects/domain/value-objects/Cell';
import { PerspectiveCamera, Vector3 } from 'three';

import { bridgeCellToWorld, FIELD_CELL_SIZE } from './fieldLayout';

/** Must stay in sync with `FieldCanvas` camera. */
export const FIELD_CAMERA = {
  fov: 46,
  near: 0.05,
  far: 140,
  position: { x: 0, y: 2.35, z: 6.4 },
  lookAt: { x: 0, y: 0.6, z: -4 },
} as const;

/**
 * Fixed fog for the field. The field camera never moves, so fog must not follow
 * the orbit camera of another screen (it used to: fog shifted after visiting
 * SceneView). Values equal the old effective default (distance 10 × 0.55 / 1.85).
 */
export const FIELD_FOG = { near: 5.5, far: 18.5 } as const;

export type ViewportSize = {
  readonly width: number;
  readonly height: number;
};

export type ProjectedCell = {
  readonly left: number;
  readonly top: number;
  /** Width of one cell on screen in px (for sprite sizing). */
  readonly cellPx: number;
};

const scratch = new Vector3();
const camera = new PerspectiveCamera(
  FIELD_CAMERA.fov,
  1,
  FIELD_CAMERA.near,
  FIELD_CAMERA.far,
);
camera.position.set(FIELD_CAMERA.position.x, FIELD_CAMERA.position.y, FIELD_CAMERA.position.z);
camera.lookAt(FIELD_CAMERA.lookAt.x, FIELD_CAMERA.lookAt.y, FIELD_CAMERA.lookAt.z);
camera.updateMatrixWorld(true);
let syncedAspect = Number.NaN;

/** The camera is static: only the aspect can change, so only then recompute. */
function syncCamera(viewport: ViewportSize): PerspectiveCamera {
  const aspect = viewport.width / Math.max(viewport.height, 1);
  if (aspect !== syncedAspect) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    syncedAspect = aspect;
  }
  return camera;
}

function projectWorld(
  world: { readonly x: number; readonly y: number; readonly z: number },
  viewport: ViewportSize,
): { readonly x: number; readonly y: number } {
  const cam = syncCamera(viewport);
  scratch.set(world.x, world.y, world.z);
  scratch.project(cam);
  return {
    x: (scratch.x * 0.5 + 0.5) * viewport.width,
    y: (-scratch.y * 0.5 + 0.5) * viewport.height,
  };
}

/** Anchor sprites on the cell floor; `cellPx` is projected cell width (shrinks with distance). */
export function projectBridgeCell(cell: Cell, viewport: ViewportSize): ProjectedCell {
  const center = bridgeCellToWorld(cell);
  const foot = projectWorld({ x: center.x, y: 0.02, z: center.z }, viewport);

  const halfSpan = FIELD_CELL_SIZE * 0.5;
  const half = projectWorld({ x: center.x + halfSpan, y: 0.02, z: center.z }, viewport);
  const cellPx = Math.max(1, Math.abs(half.x - foot.x) * 2);

  return {
    left: foot.x,
    top: foot.y,
    cellPx,
  };
}
