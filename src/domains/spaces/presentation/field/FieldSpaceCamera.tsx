import { useFrame, useThree } from '@react-three/fiber/native';
import { useLayoutEffect } from 'react';
import type { ReactElement } from 'react';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

import { FIELD_CAMERA_DEFAULT_POSE } from './fieldCameraFraming';
import { useFieldCameraControlStore } from './fieldCameraControlStore';
import { cameraNeedsProjectionUpdate } from './fieldCameraMotion';
import { FIELD_WORLD_UP } from './fieldGridConfig';

const FIELD_CAMERA_FOV = FIELD_CAMERA_DEFAULT_POSE.fov;
const ROTATION_ORDER = 'ZXY' as const;
const WORLD_UP = new Vector3(...FIELD_WORLD_UP);

function applyStoreToCamera(camera: PerspectiveCamera): void {
  const state = useFieldCameraControlStore.getState();
  if (!state.ready) return;
  const needsProjection = cameraNeedsProjectionUpdate(camera, state);
  camera.up.copy(WORLD_UP);
  camera.position.set(state.position.x, state.position.y, state.position.z);
  camera.rotation.order = ROTATION_ORDER;
  camera.rotation.set(
    MathUtils.degToRad(state.rotationDeg.x),
    MathUtils.degToRad(state.rotationDeg.y),
    MathUtils.degToRad(state.rotationDeg.z),
  );
  if (!needsProjection) return;
  camera.fov = state.fov;
  camera.near = state.near;
  camera.far = state.far;
  camera.updateProjectionMatrix();
}

function applyLockedDefault(camera: PerspectiveCamera): void {
  const pose = FIELD_CAMERA_DEFAULT_POSE;
  camera.up.copy(WORLD_UP);
  camera.fov = pose.fov;
  camera.near = pose.near;
  camera.far = pose.far;
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.rotation.order = ROTATION_ORDER;
  camera.rotation.set(
    MathUtils.degToRad(pose.rotationDeg.x),
    MathUtils.degToRad(pose.rotationDeg.y),
    MathUtils.degToRad(pose.rotationDeg.z),
  );
  camera.updateProjectionMatrix();
  useFieldCameraControlStore.getState().hydrateFromFraming(pose);
}

/** Applies the locked default pose, then follows the developer camera control store. */
export function FieldSpaceCamera(): ReactElement | null {
  const { camera } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camera.up.copy(WORLD_UP);

    const userAdjusted = useFieldCameraControlStore.getState().userAdjusted;
    if (userAdjusted) {
      applyStoreToCamera(camera);
      return;
    }
    applyLockedDefault(camera);
  }, [camera]);

  useFrame(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    applyStoreToCamera(camera);
  });

  return null;
}

export { FIELD_CAMERA_FOV };
