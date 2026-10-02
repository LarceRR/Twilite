import { BLENDER_FILM_GAUGE_MM, fovDegFromFocalLengthMm } from './fieldCameraOptics';
import { lookAtFromPose, type FieldCameraPose } from './fieldCameraPose';

/** Tuned Space startup framing (saved from live camera control). */
export const FIELD_CAMERA_START = {
  position: { x: 0, y: 2.05, z: 3.82 },
  yawDeg: 0,
  pitchDeg: -6.6,
  rollDeg: 0,
  focalLengthMm: 40.4,
  /** Near-base width squeeze at launch (1 ≈ previous “100%”). */
  surfaceBaseCompression: 1,
  /** Far-end width — natural by default. */
  surfaceEndCompression: 0,
  near: 0.05,
  far: 140,
} as const;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function createDefaultFieldCameraPose(): FieldCameraPose {
  return {
    position: { ...FIELD_CAMERA_START.position },
    yaw: degToRad(FIELD_CAMERA_START.yawDeg),
    pitch: degToRad(FIELD_CAMERA_START.pitchDeg),
    roll: degToRad(FIELD_CAMERA_START.rollDeg),
    focalLengthMm: FIELD_CAMERA_START.focalLengthMm,
  };
}

const defaultPose = createDefaultFieldCameraPose();
const defaultLookAt = lookAtFromPose(defaultPose);

/**
 * Bootstrap values for the R3F Canvas camera.
 * Live pose still comes from `useFieldCameraStore` / FieldCameraRig.
 */
export const FIELD_CAMERA = {
  fov: fovDegFromFocalLengthMm(FIELD_CAMERA_START.focalLengthMm, BLENDER_FILM_GAUGE_MM, 1),
  near: FIELD_CAMERA_START.near,
  far: FIELD_CAMERA_START.far,
  position: FIELD_CAMERA_START.position,
  lookAt: defaultLookAt,
} as const;
