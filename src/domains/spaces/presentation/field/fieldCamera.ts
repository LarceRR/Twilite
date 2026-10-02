import type { Cell } from '@/domains/surface-objects/domain/value-objects/Cell';
import { PerspectiveCamera, Vector3 } from 'three';

import { BLENDER_FILM_GAUGE_MM } from './fieldCameraOptics';
import { FIELD_CAMERA } from './fieldCameraDefaults';
import { fovFromPose, lookAtFromPose } from './fieldCameraPose';
import { useFieldCameraStore } from './fieldCameraStore';
import { bridgeCellToWorld, FIELD_CELL_SIZE } from './fieldLayout';

export { FIELD_CAMERA } from './fieldCameraDefaults';

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
const camera = new PerspectiveCamera();

function syncCamera(viewport: ViewportSize): PerspectiveCamera {
  const pose = useFieldCameraStore.getState().pose;
  const aspect = viewport.width / Math.max(viewport.height, 1);
  const lookAt = lookAtFromPose(pose);
  camera.filmGauge = BLENDER_FILM_GAUGE_MM;
  camera.fov = fovFromPose(pose, aspect);
  camera.aspect = aspect;
  camera.near = FIELD_CAMERA.near;
  camera.far = FIELD_CAMERA.far;
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.up.set(0, 1, 0);
  camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  if (Math.abs(pose.roll) > 1e-6) {
    camera.rotateZ(pose.roll);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
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
  const half = projectWorld(
    { x: center.x + halfSpan, y: 0.02, z: center.z },
    viewport,
  );
  const cellPx = Math.max(1, Math.abs(half.x - foot.x) * 2);

  return {
    left: foot.x,
    top: foot.y,
    cellPx,
  };
}
