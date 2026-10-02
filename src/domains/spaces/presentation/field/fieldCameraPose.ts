import {
  BLENDER_FILM_GAUGE_MM,
  clampFocalLengthMm,
  focalLengthMmFromFovDeg,
  fovDegFromFocalLengthMm,
} from './fieldCameraOptics';

export type Vec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type FieldCameraPose = {
  readonly position: Vec3;
  readonly yaw: number;
  readonly pitch: number;
  readonly roll: number;
  readonly focalLengthMm: number;
};

/** Direction pad only — move / rotate. Optics & surface have dedicated steppers. */
export type CameraControlMode = 'move' | 'rotate';
export type CameraAxis = 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward';

export const CAMERA_MOVE_STEP = 0.25;
export const CAMERA_ROTATE_STEP_RAD = (4 * Math.PI) / 180;
export const CAMERA_FOCAL_STEP_MM = 2;
export const CAMERA_COMPRESS_STEP = 0.05;

/** Near ±90° so free look is usable; tiny epsilon avoids lookAt flip. */
const PITCH_LIMIT = (89.9 * Math.PI) / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function add(a: Vec3, b: Vec3, scale = 1): Vec3 {
  return { x: a.x + b.x * scale, y: a.y + b.y * scale, z: a.z + b.z * scale };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-8) return { x: 0, y: 0, z: -1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Local camera basis from yaw (Y) + pitch (X), Three.js Y-up / −Z forward. */
export function cameraBasis(yaw: number, pitch: number): {
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
} {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const forward = normalize({ x: sy * cp, y: sp, z: -cy * cp });
  const worldUp = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(forward, worldUp));
  const up = normalize(cross(right, forward));
  return { forward, right, up };
}

export function lookAtFromPose(pose: FieldCameraPose): Vec3 {
  const { forward } = cameraBasis(pose.yaw, pose.pitch);
  return add(pose.position, forward);
}

export function poseFromPositionLookAt(
  position: Vec3,
  lookAt: Vec3,
  fovDeg: number,
  aspect = 1,
): FieldCameraPose {
  const dx = lookAt.x - position.x;
  const dy = lookAt.y - position.y;
  const dz = lookAt.z - position.z;
  const forward = normalize({ x: dx, y: dy, z: dz });
  const pitch = Math.asin(clamp(forward.y, -1, 1));
  const yaw = Math.atan2(forward.x, -forward.z);
  return {
    position,
    yaw,
    pitch,
    roll: 0,
    focalLengthMm: clampFocalLengthMm(
      focalLengthMmFromFovDeg(fovDeg, BLENDER_FILM_GAUGE_MM, aspect),
    ),
  };
}

export function fovFromPose(pose: FieldCameraPose, aspect: number): number {
  return fovDegFromFocalLengthMm(pose.focalLengthMm, BLENDER_FILM_GAUGE_MM, aspect);
}

function movePose(pose: FieldCameraPose, axis: CameraAxis): FieldCameraPose {
  const { forward, right, up } = cameraBasis(pose.yaw, pose.pitch);
  const step =
    axis === 'forward' || axis === 'right' || axis === 'up'
      ? CAMERA_MOVE_STEP
      : -CAMERA_MOVE_STEP;
  const dir =
    axis === 'forward' || axis === 'backward'
      ? forward
      : axis === 'left' || axis === 'right'
        ? right
        : up;
  return { ...pose, position: add(pose.position, dir, step) };
}

function rotatePose(pose: FieldCameraPose, axis: CameraAxis): FieldCameraPose {
  switch (axis) {
    case 'left':
      return { ...pose, yaw: pose.yaw + CAMERA_ROTATE_STEP_RAD };
    case 'right':
      return { ...pose, yaw: pose.yaw - CAMERA_ROTATE_STEP_RAD };
    case 'up':
      return {
        ...pose,
        pitch: clamp(pose.pitch + CAMERA_ROTATE_STEP_RAD, -PITCH_LIMIT, PITCH_LIMIT),
      };
    case 'down':
      return {
        ...pose,
        pitch: clamp(pose.pitch - CAMERA_ROTATE_STEP_RAD, -PITCH_LIMIT, PITCH_LIMIT),
      };
    case 'forward':
      return { ...pose, roll: pose.roll + CAMERA_ROTATE_STEP_RAD };
    case 'backward':
      return { ...pose, roll: pose.roll - CAMERA_ROTATE_STEP_RAD };
  }
}

export function applyCameraAxisStep(
  pose: FieldCameraPose,
  mode: CameraControlMode,
  axis: CameraAxis,
): FieldCameraPose {
  if (mode === 'move') return movePose(pose, axis);
  return rotatePose(pose, axis);
}

export function applyFocalLengthStep(focalLengthMm: number, direction: 1 | -1): number {
  return clampFocalLengthMm(focalLengthMm + direction * CAMERA_FOCAL_STEP_MM);
}

/** Positive compresses, negative expands — no hard 0..1 cap. */
export function applyCompressionStep(compression: number, direction: 1 | -1): number {
  return compression + direction * CAMERA_COMPRESS_STEP;
}

export const CAMERA_CONTROL_MODE_LABELS: Readonly<Record<CameraControlMode, string>> = {
  move: 'Перемещение',
  rotate: 'Вращение',
};

export const CAMERA_AXIS_LABELS: Readonly<Record<CameraAxis, string>> = {
  up: 'Вверх',
  down: 'Вниз',
  left: 'Влево',
  right: 'Вправо',
  forward: 'Вперёд',
  backward: 'Назад',
};

export const CAMERA_CONTROL_MODES: readonly CameraControlMode[] = ['move', 'rotate'];

export const CAMERA_AXES: readonly CameraAxis[] = [
  'up',
  'down',
  'left',
  'right',
  'forward',
  'backward',
];
