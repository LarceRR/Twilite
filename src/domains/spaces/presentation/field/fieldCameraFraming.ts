import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import type { Vec3 } from './fieldCameraMotion';

export type FieldCameraPose = {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
};

export type FieldCameraOptics = {
  readonly position: Vec3;
  readonly rotationDeg: Vec3;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
};

/**
 * Locked default field camera (Z-up), tuned on device.
 * fov = vertical field of view in degrees;
 * near/far = clipping planes (geometry closer than near or farther than far is culled).
 */
export const FIELD_CAMERA_DEFAULT_POSE: FieldCameraOptics = {
  position: DEFAULT_FIELD_CONFIG.camera.position,
  rotationDeg: DEFAULT_FIELD_CONFIG.camera.rotationDeg,
  fov: DEFAULT_FIELD_CONFIG.camera.fov,
  near: DEFAULT_FIELD_CONFIG.camera.near,
  far: DEFAULT_FIELD_CONFIG.camera.far,
};

export function fieldCameraOpticsFromConfig(): FieldCameraOptics {
  const camera = getFieldConfig().camera;
  return {
    position: camera.position,
    rotationDeg: camera.rotationDeg,
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
  };
}

export type FieldCameraFramingInput = {
  readonly width: number;
  readonly depth: number;
  readonly fovDeg: number;
  readonly aspect: number;
  /** Padding around the plane; >1 zooms out. */
  readonly margin?: number;
  /** Degrees above the XY ground; 90 = straight top-down along +Z. */
  readonly elevationDeg?: number;
  /**
   * Look-at point. Default is the deck geometric center when the left-edge
   * mesh origin is at world (0,0,0): (width/2, 0, 0).
   */
  readonly target?: readonly [number, number, number];
};

function halfFovRadians(fovDeg: number, aspect: number): {
  readonly halfV: number;
  readonly halfH: number;
} {
  const halfV = (fovDeg * Math.PI) / 180 / 2;
  const halfH = Math.atan(Math.tan(halfV) * Math.max(aspect, 0.01));
  return { halfV, halfH };
}

/** Distance that fits a ground-plane bounding sphere into the perspective frustum. */
export function distanceToFitFieldPlane(input: FieldCameraFramingInput): number {
  const margin = input.margin ?? getFieldConfig().camera.framingMargin;
  const halfW = (input.width / 2) * margin;
  const halfD = (input.depth / 2) * margin;
  const radius = Math.hypot(halfW, halfD);
  const { halfV, halfH } = halfFovRadians(input.fovDeg, input.aspect);
  return radius / Math.sin(Math.min(halfV, halfH));
}

/**
 * Z-up framing helper (not used for the locked default; kept for framing experiments).
 */
export function computeFieldCameraPose(input: FieldCameraFramingInput): FieldCameraPose {
  const elevationDeg =
    input.elevationDeg ?? getFieldConfig().camera.framingElevationDeg;
  const elev = (elevationDeg * Math.PI) / 180;
  const dist = distanceToFitFieldPlane(input);
  const target = input.target ?? ([input.width / 2, 0, 0] as const);
  return {
    position: [
      target[0],
      target[1] - Math.cos(elev) * dist,
      target[2] + Math.sin(elev) * dist,
    ],
    target,
  };
}
