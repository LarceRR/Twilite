import { useFrame, useThree } from '@react-three/fiber/native';
import { memo, type ReactElement } from 'react';
import type { PerspectiveCamera } from 'three';

import { FIELD_CAMERA } from './fieldCameraDefaults';
import { BLENDER_FILM_GAUGE_MM } from './fieldCameraOptics';
import { fovFromPose, lookAtFromPose } from './fieldCameraPose';
import { useFieldCameraStore } from './fieldCameraStore';

export function isPerspectiveCamera(camera: unknown): camera is PerspectiveCamera {
  return (
    typeof camera === 'object' &&
    camera !== null &&
    'isPerspectiveCamera' in camera &&
    (camera as { isPerspectiveCamera?: boolean }).isPerspectiveCamera === true
  );
}

/** Applies live field-camera pose (position / orientation / Blender-like focal length) each frame. */
function FieldCameraRigComponent(): ReactElement | null {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useFrame(() => {
    if (!isPerspectiveCamera(camera)) return;
    const pose = useFieldCameraStore.getState().pose;
    const aspect = size.width / Math.max(size.height, 1);
    const lookAt = lookAtFromPose(pose);

    camera.near = FIELD_CAMERA.near;
    camera.far = FIELD_CAMERA.far;
    camera.filmGauge = BLENDER_FILM_GAUGE_MM;
    camera.fov = fovFromPose(pose, aspect);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    if (Math.abs(pose.roll) > 1e-6) {
      camera.rotateZ(pose.roll);
    }
    camera.updateProjectionMatrix();
  });

  return null;
}

export const FieldCameraRig = memo(FieldCameraRigComponent);
