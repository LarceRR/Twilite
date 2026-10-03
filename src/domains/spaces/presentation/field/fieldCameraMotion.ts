import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';

export type Vec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type CameraMoveAxis = 'left' | 'right' | 'up' | 'down' | 'forward' | 'back';
export type CameraRotateAxis = 'x' | 'y' | 'z';
export type WorldAxis = 'x' | 'y' | 'z';

/**
 * Z-up world: X right, Y depth on the ground, Z up.
 * RGB: X red, Y green, Z blue.
 */
export function worldAxisFromMove(axis: CameraMoveAxis): WorldAxis {
  if (axis === 'left' || axis === 'right') return 'x';
  if (axis === 'up' || axis === 'down') return 'z';
  return 'y';
}

/** One logical pixel in world units (matches field cell pixel scale). */
export const CAMERA_MOVE_STEP_PX = DEFAULT_FIELD_CONFIG.camera.moveStepPx;

/** One degree per rotate tap / hold unit. */
export const CAMERA_ROTATE_STEP_DEG = DEFAULT_FIELD_CONFIG.camera.rotateStepDeg;

/** Hold ramp: reaches max step after this many ms. */
export const CAMERA_HOLD_RAMP_MS = DEFAULT_FIELD_CONFIG.camera.holdRampMs;

/** Cap for hold acceleration (pixels or degrees per tick). */
export const CAMERA_HOLD_MAX_STEP = DEFAULT_FIELD_CONFIG.camera.holdMaxStep;

/** Dev HUD text publish interval — avoid React Glass/Text churn every hold tick. */
export const CAMERA_HUD_PUBLISH_MS = DEFAULT_FIELD_CONFIG.camera.hudPublishMs;

export function shouldPublishThrottled(
  nowMs: number,
  lastPublishMs: number,
  intervalMs?: number,
): boolean {
  const interval = intervalMs ?? getFieldConfig().camera.hudPublishMs;
  return nowMs - lastPublishMs >= interval;
}

export function cameraNeedsProjectionUpdate(
  camera: { readonly fov: number; readonly near: number; readonly far: number },
  optics: { readonly fov: number; readonly near: number; readonly far: number },
): boolean {
  return (
    camera.fov !== optics.fov ||
    camera.near !== optics.near ||
    camera.far !== optics.far
  );
}

export function holdRepeatDelta(
  elapsedMs: number,
  rampMs?: number,
  maxStep?: number,
): number {
  const camera = getFieldConfig().camera;
  const ramp = rampMs ?? camera.holdRampMs;
  const max = maxStep ?? camera.holdMaxStep;
  const t = Math.min(1, Math.max(0, elapsedMs) / ramp);
  return Math.max(1, Math.round(1 + t * (max - 1)));
}

export function nextRotateAxis(axis: CameraRotateAxis): CameraRotateAxis {
  if (axis === 'x') return 'y';
  if (axis === 'y') return 'z';
  return 'x';
}

export function moveCameraPosition(
  position: Vec3,
  axis: CameraMoveAxis,
  delta: number,
): Vec3 {
  switch (axis) {
    case 'left':
      return { x: position.x - delta, y: position.y, z: position.z };
    case 'right':
      return { x: position.x + delta, y: position.y, z: position.z };
    case 'up':
      return { x: position.x, y: position.y, z: position.z + delta };
    case 'down':
      return { x: position.x, y: position.y, z: position.z - delta };
    case 'forward':
      return { x: position.x, y: position.y + delta, z: position.z };
    case 'back':
      return { x: position.x, y: position.y - delta, z: position.z };
  }
}

export function rotateCameraEuler(
  rotationDeg: Vec3,
  axis: CameraRotateAxis,
  deltaDeg: number,
): Vec3 {
  if (axis === 'x') return { ...rotationDeg, x: rotationDeg.x + deltaDeg };
  if (axis === 'y') return { ...rotationDeg, y: rotationDeg.y + deltaDeg };
  return { ...rotationDeg, z: rotationDeg.z + deltaDeg };
}

export function formatCameraHudLine(
  label: string,
  value: number,
  digits: number = 1,
): string {
  return `${label} ${value.toFixed(digits)}`;
}

export function formatCameraHud(input: {
  readonly position: Vec3;
  readonly rotationDeg: Vec3;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
}): string {
  const { position: p, rotationDeg: r } = input;
  return [
    formatCameraHudLine('pos.x', p.x),
    formatCameraHudLine('pos.y', p.y),
    formatCameraHudLine('pos.z', p.z),
    formatCameraHudLine('rot.x', r.x),
    formatCameraHudLine('rot.y', r.y),
    formatCameraHudLine('rot.z', r.z),
    formatCameraHudLine('fov', input.fov, 0),
    formatCameraHudLine('near', input.near, 0),
    formatCameraHudLine('far', input.far, 0),
  ].join('\n');
}
