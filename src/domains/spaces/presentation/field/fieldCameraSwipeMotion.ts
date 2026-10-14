import type { PerspectiveCamera } from 'three';

import { useFieldCameraControlStore } from './fieldCameraControlStore';
import { fieldCameraOpticsFromConfig } from './fieldCameraFraming';
import { cameraForwardDirection, type Vec3 } from './fieldCameraMotion';
import { getFieldConfig } from './fieldConfigStore';

type CameraSwipePath = {
  readonly origin: Vec3;
  readonly direction: Vec3;
  readonly baselinePosition: Vec3;
  readonly baselineForward: Vec3;
  /** Signed world distance from origin along direction. */
  distance: number;
};

type ActiveCameraSwipe = {
  readonly path: CameraSwipePath;
  readonly worldUnitsPerPoint: number;
  velocityY: number;
};

type CameraSwipeInertia = {
  readonly path: CameraSwipePath;
  /** Signed world units per second along path.direction. */
  readonly velocity: number;
  elapsedSeconds: number;
};

let activeSwipe: ActiveCameraSwipe | null = null;
let inertia: CameraSwipeInertia | null = null;

function groundDirection(direction: Vec3): Vec3 {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length < Number.EPSILON) {
    return { x: 1, y: 0, z: 0 };
  }

  return { x: direction.x / length, y: direction.y / length, z: 0 };
}

function positionAt(path: CameraSwipePath, distance: number): Vec3 {
  return {
    x: path.origin.x + path.direction.x * distance,
    y: path.origin.y + path.direction.y * distance,
    z: path.origin.z,
  };
}

/**
 * Prevents a swipe from moving the camera farther behind the default framing
 * position. The returned value is the allowed delta, not an absolute distance.
 */
function clampDistanceDelta(path: CameraSwipePath, delta: number): number {
  if (!Number.isFinite(delta) || delta === 0) return 0;

  const forwardProjection =
    path.direction.x * path.baselineForward.x +
    path.direction.y * path.baselineForward.y;

  // This path is perpendicular to the baseline forward direction, or the
  // requested movement is away from the baseline, so no clamp is required.
  if (Math.abs(forwardProjection) < Number.EPSILON || delta * forwardProjection >= 0) {
    return delta;
  }

  const currentPosition = positionAt(path, path.distance);
  const forwardOffset =
    (currentPosition.x - path.baselinePosition.x) * path.baselineForward.x +
    (currentPosition.y - path.baselinePosition.y) * path.baselineForward.y;

  if (forwardOffset <= 0) return 0;

  const deltaToBaseline = -forwardOffset / forwardProjection;
  return Math.abs(delta) > Math.abs(deltaToBaseline) ? deltaToBaseline : delta;
}

function createPath(position: Vec3, rotationDeg: Vec3): CameraSwipePath {
  const framing = fieldCameraOpticsFromConfig();

  return {
    origin: { ...position },
    direction: groundDirection(cameraForwardDirection(rotationDeg)),
    baselinePosition: framing.position,
    baselineForward: groundDirection(cameraForwardDirection(framing.rotationDeg)),
    distance: 0,
  };
}

function commitPosition(position: Vec3): void {
  useFieldCameraControlStore.getState().setPosition(position);
}

/**
 * Stops an in-progress gesture/coast when the canvas unmounts. Persisting the
 * rendered pose prevents module-level inertia from resuming against a newly
 * created camera at the older release position.
 */
export function cancelCameraSwipeMotion(position: Vec3): void {
  const hadPendingMotion = activeSwipe !== null || inertia !== null;
  activeSwipe = null;
  inertia = null;

  if (hadPendingMotion) {
    commitPosition({ x: position.x, y: position.y, z: position.z });
  }
}

/**
 * Stops the coast at its latest rendered position on touch-down.
 *
 * This is separate from beginCameraSwipe because a pan only becomes active
 * after its movement threshold is crossed. A stationary finger must still be
 * able to catch and hold the camera in place.
 */
export function stopCameraSwipeInertia(): void {
  if (inertia === null) return;

  const position = positionAt(inertia.path, inertia.path.distance);
  inertia = null;
  commitPosition(position);
}

export function beginCameraSwipe(): void {
  // Defensive fallback: if the pan starts without a touch-down interruption,
  // begin exactly where the inertia was last rendered.
  if (inertia !== null) {
    const position = positionAt(inertia.path, inertia.path.distance);
    inertia = null;
    commitPosition(position);
  }

  const { position, rotationDeg } = useFieldCameraControlStore.getState();
  activeSwipe = {
    path: createPath(position, rotationDeg),
    worldUnitsPerPoint: getFieldConfig().camera.moveStepPx,
    velocityY: 0,
  };
}

export function updateCameraSwipe(translationYDelta: number, velocityY?: number): void {
  if (activeSwipe === null || !Number.isFinite(translationYDelta)) return;

  const requestedDelta = translationYDelta * activeSwipe.worldUnitsPerPoint;
  activeSwipe.path.distance += clampDistanceDelta(activeSwipe.path, requestedDelta);

  if (velocityY !== undefined && Number.isFinite(velocityY)) {
    activeSwipe.velocityY = velocityY;
  }
}

export function applyPendingCameraSwipeMovement(
  camera: PerspectiveCamera,
  deltaSeconds: number = 0,
): void {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

  const cameraConfig = getFieldConfig().camera;
  const maxFrameDelta = cameraConfig.swipeFrameDeltaMaxSec;
  const frameDelta =
    Number.isFinite(maxFrameDelta) && maxFrameDelta > 0
      ? Math.min(deltaSeconds, maxFrameDelta)
      : Math.min(deltaSeconds, 1 / 30);

  // Follow the gesture directly. Exponential lag here made the committed
  // position trail the finger and caused a backwards snap when the gesture
  // ended. The gesture itself is already sampled by the animation frame loop.
  if (activeSwipe !== null) {
    camera.position.copy(positionAt(activeSwipe.path, activeSwipe.path.distance));
    return;
  }

  if (inertia === null) return;

  const drag = cameraConfig.swipeInertiaDrag;
  // drag is an exponential per-second multiplier and must be in (0, 1).
  if (!Number.isFinite(drag) || drag <= 0 || drag >= 1) {
    const finalPosition = positionAt(inertia.path, inertia.path.distance);
    inertia = null;
    camera.position.copy(finalPosition);
    commitPosition(finalPosition);
    return;
  }

  inertia.elapsedSeconds += frameDelta;

  // Analytic integration of v(t) = v0 * drag^t. This makes the coast
  // independent of frame rate rather than accumulating per-frame decay error.
  const decay = Math.pow(drag, inertia.elapsedSeconds);
  const dragLog = Math.log(drag);
  const totalDistance = (inertia.velocity * (decay - 1)) / dragLog;
  const requestedDelta = totalDistance - inertia.path.distance;
  const appliedDelta = clampDistanceDelta(inertia.path, requestedDelta);
  inertia.path.distance += appliedDelta;

  const position = positionAt(inertia.path, inertia.path.distance);
  camera.position.copy(position);

  const speed = Math.abs(inertia.velocity * decay);
  if (
    appliedDelta !== requestedDelta ||
    !Number.isFinite(speed) ||
    speed < cameraConfig.swipeInertiaStopSpeed
  ) {
    inertia = null;
    commitPosition(position);
  }
}

export function finishCameraSwipe(velocityY: number = 0): void {
  if (activeSwipe === null) return;

  const { path, velocityY: lastGestureVelocity, worldUnitsPerPoint } = activeSwipe;
  activeSwipe = null;

  // Commit the exact final gesture position. There is no separately smoothed
  // position to drift out of sync with the rendered camera.
  const finalPosition = positionAt(path, path.distance);
  commitPosition(finalPosition);

  const releaseVelocity =
    Number.isFinite(velocityY) && velocityY !== 0 ? velocityY : lastGestureVelocity;
  const cameraConfig = getFieldConfig().camera;
  const speedScale = cameraConfig.swipeInertiaSpeedScale;
  const maxSpeed = cameraConfig.swipeInertiaMaxSpeed;
  if (
    !Number.isFinite(releaseVelocity) ||
    !Number.isFinite(speedScale) ||
    speedScale <= 0 ||
    !Number.isFinite(maxSpeed) ||
    maxSpeed <= 0
  ) {
    inertia = null;
    return;
  }

  const scaledVelocity =
    releaseVelocity * speedScale * worldUnitsPerPoint;
  const velocity = Math.max(-maxSpeed, Math.min(maxSpeed, scaledVelocity));
  const stopSpeed = cameraConfig.swipeInertiaStopSpeed;

  if (!Number.isFinite(velocity) || !Number.isFinite(stopSpeed) || Math.abs(velocity) < stopSpeed) {
    inertia = null;
    return;
  }

  inertia = {
    path: { ...path, origin: finalPosition, distance: 0 },
    velocity,
    elapsedSeconds: 0,
  };
}

