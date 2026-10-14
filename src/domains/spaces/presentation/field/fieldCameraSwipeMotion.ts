import type { PerspectiveCamera } from 'three';

import { useFieldCameraControlStore } from './fieldCameraControlStore';
import { fieldCameraOpticsFromConfig } from './fieldCameraFraming';
import { cameraForwardDirection, type Vec3 } from './fieldCameraMotion';
import { getFieldConfig } from './fieldConfigStore';

type CameraSwipePath = {
  readonly origin: Vec3;
  readonly direction: Vec3;
  readonly height: number;
  readonly baselinePosition: Vec3;
  readonly baselineForward: Vec3;
  distance: number;
};

type ActiveCameraSwipe = {
  readonly path: CameraSwipePath;
  readonly worldUnitsPerPoint: number;
  renderedDistance: number;
  velocity: number;
};

type CameraSwipeInertia = {
  readonly path: CameraSwipePath;
  velocity: number;
  elapsedSeconds: number;
};

let activeSwipe: ActiveCameraSwipe | null = null;
let inertia: CameraSwipeInertia | null = null;

function groundDirection(direction: Vec3): Vec3 {
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0) return { x: 1, y: 0, z: 0 };
  return { x: direction.x / length, y: direction.y / length, z: 0 };
}

function positionAt(path: CameraSwipePath, distance: number): Vec3 {
  return {
    x: path.origin.x + path.direction.x * distance,
    y: path.origin.y + path.direction.y * distance,
    z: path.height,
  };
}

function clampDistance(path: CameraSwipePath, distance: number): number {
  const forwardProjection =
    path.direction.x * path.baselineForward.x + path.direction.y * path.baselineForward.y;
  if (forwardProjection === 0 || distance * forwardProjection >= 0) return distance;

  const currentPosition = positionAt(path, path.distance);
  const forwardOffset =
    (currentPosition.x - path.baselinePosition.x) * path.baselineForward.x +
    (currentPosition.y - path.baselinePosition.y) * path.baselineForward.y;
  if (forwardOffset <= 0) return 0;

  const distanceToBaseline = -forwardOffset / forwardProjection;
  return Math.abs(distance) > Math.abs(distanceToBaseline) ? distanceToBaseline : distance;
}

function createPath(position: Vec3, rotationDeg: Vec3): CameraSwipePath {
  const framing = fieldCameraOpticsFromConfig();
  const baselineForward = groundDirection(cameraForwardDirection(framing.rotationDeg));
  return {
    origin: { x: position.x, y: position.y, z: framing.position.z },
    direction: groundDirection(cameraForwardDirection(rotationDeg)),
    height: framing.position.z,
    baselinePosition: framing.position,
    baselineForward,
    distance: 0,
  };
}

export function beginCameraSwipe(): void {
  if (inertia !== null) {
    const position = positionAt(inertia.path, inertia.path.distance);
    inertia = null;
    useFieldCameraControlStore.getState().setPosition(position);
  }
  const { position, rotationDeg } = useFieldCameraControlStore.getState();
  activeSwipe = {
    path: createPath(position, rotationDeg),
    worldUnitsPerPoint: getFieldConfig().camera.moveStepPx,
    renderedDistance: 0,
    velocity: 0,
  };
}

export function updateCameraSwipe(translationYDelta: number, velocityY?: number): void {
  if (activeSwipe === null || !Number.isFinite(translationYDelta)) return;
  const distance = translationYDelta * activeSwipe.worldUnitsPerPoint;
  const appliedDistance = clampDistance(activeSwipe.path, distance);
  activeSwipe.path.distance += appliedDistance;
  if (velocityY !== undefined && Number.isFinite(velocityY) && velocityY !== 0) {
    activeSwipe.velocity = velocityY;
  }
}

export function applyPendingCameraSwipeMovement(
  camera: PerspectiveCamera,
  deltaSeconds: number = 0,
): void {
  if (deltaSeconds <= 0) return;
  const cameraConfig = getFieldConfig().camera;
  const frameDelta = Math.min(deltaSeconds, cameraConfig.swipeFrameDeltaMaxSec);

  if (activeSwipe !== null) {
    const follow = 1 - Math.exp(-cameraConfig.swipeFollowResponse * frameDelta);
    activeSwipe.renderedDistance +=
      (activeSwipe.path.distance - activeSwipe.renderedDistance) * follow;
    camera.position.copy(positionAt(activeSwipe.path, activeSwipe.renderedDistance));
  }

  if (inertia === null) return;
  inertia.elapsedSeconds += frameDelta;
  const dragLog = Math.log(cameraConfig.swipeInertiaDrag);
  const simulatedDistance =
    (inertia.velocity * (Math.pow(cameraConfig.swipeInertiaDrag, inertia.elapsedSeconds) - 1)) /
    dragLog;
  const frameDistance = simulatedDistance - inertia.path.distance;
  const appliedDistance = clampDistance(inertia.path, frameDistance);
  inertia.path.distance += appliedDistance;
  camera.position.copy(positionAt(inertia.path, inertia.path.distance));

  const speed = Math.abs(
    inertia.velocity * Math.pow(cameraConfig.swipeInertiaDrag, inertia.elapsedSeconds),
  );
  if (appliedDistance !== frameDistance || speed < cameraConfig.swipeInertiaStopSpeed) {
    const finalPosition = positionAt(inertia.path, inertia.path.distance);
    inertia = null;
    useFieldCameraControlStore.getState().setPosition(finalPosition);
  }
}

export function finishCameraSwipe(velocityY: number = 0): void {
  if (activeSwipe === null) return;
  const { path, renderedDistance, velocity: lastGestureVelocity } = activeSwipe;
  activeSwipe = null;
  const finalPosition = positionAt(path, renderedDistance);
  useFieldCameraControlStore.getState().setPosition(finalPosition);

  const releaseVelocity =
    Number.isFinite(velocityY) && velocityY !== 0 ? velocityY : lastGestureVelocity;
  const cameraConfig = getFieldConfig().camera;
  const scaledVelocity =
    releaseVelocity * cameraConfig.swipeInertiaSpeedScale * cameraConfig.moveStepPx;
  const velocity = Math.max(
    -cameraConfig.swipeInertiaMaxSpeed,
    Math.min(cameraConfig.swipeInertiaMaxSpeed, scaledVelocity),
  );
  if (Math.abs(velocity) < cameraConfig.swipeInertiaStopSpeed) return;

  inertia = {
    path: { ...path, origin: finalPosition, distance: 0 },
    velocity,
    elapsedSeconds: 0,
  };
}
