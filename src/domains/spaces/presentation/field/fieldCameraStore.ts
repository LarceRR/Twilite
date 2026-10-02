import { create } from 'zustand';

import {
  createDefaultFieldCameraPose,
  FIELD_CAMERA_START,
} from './fieldCameraDefaults';
import {
  applyCameraAxisStep,
  applyCompressionStep,
  applyFocalLengthStep,
  type CameraAxis,
  type CameraControlMode,
  type FieldCameraPose,
} from './fieldCameraPose';

type FieldCameraState = {
  readonly pose: FieldCameraPose;
  readonly mode: CameraControlMode;
  /** Near-base width: 0 natural, + squeeze, − expand. */
  readonly surfaceBaseCompression: number;
  /** Far-end width: 0 natural, + squeeze, − expand. */
  readonly surfaceEndCompression: number;
  readonly revision: number;
  setMode: (mode: CameraControlMode) => void;
  nudgeAxis: (axis: CameraAxis) => void;
  nudgeFocal: (direction: 1 | -1) => void;
  nudgeBaseCompression: (direction: 1 | -1) => void;
  nudgeEndCompression: (direction: 1 | -1) => void;
  resetPose: () => void;
};

export const useFieldCameraStore = create<FieldCameraState>()((set, get) => ({
  pose: createDefaultFieldCameraPose(),
  mode: 'move',
  surfaceBaseCompression: FIELD_CAMERA_START.surfaceBaseCompression,
  surfaceEndCompression: FIELD_CAMERA_START.surfaceEndCompression,
  revision: 0,
  setMode: (mode) => set({ mode }),
  nudgeAxis: (axis) => {
    const { pose, mode, revision } = get();
    set({
      pose: applyCameraAxisStep(pose, mode, axis),
      revision: revision + 1,
    });
  },
  nudgeFocal: (direction) => {
    const { pose, revision } = get();
    set({
      pose: {
        ...pose,
        focalLengthMm: applyFocalLengthStep(pose.focalLengthMm, direction),
      },
      revision: revision + 1,
    });
  },
  nudgeBaseCompression: (direction) => {
    const { surfaceBaseCompression, revision } = get();
    set({
      surfaceBaseCompression: applyCompressionStep(surfaceBaseCompression, direction),
      revision: revision + 1,
    });
  },
  nudgeEndCompression: (direction) => {
    const { surfaceEndCompression, revision } = get();
    set({
      surfaceEndCompression: applyCompressionStep(surfaceEndCompression, direction),
      revision: revision + 1,
    });
  },
  resetPose: () =>
    set({
      pose: createDefaultFieldCameraPose(),
      surfaceBaseCompression: FIELD_CAMERA_START.surfaceBaseCompression,
      surfaceEndCompression: FIELD_CAMERA_START.surfaceEndCompression,
      revision: get().revision + 1,
    }),
}));

export const selectFieldCameraPose = (s: FieldCameraState): FieldCameraPose => s.pose;
export const selectFieldCameraMode = (s: FieldCameraState): CameraControlMode => s.mode;
export const selectSurfaceBaseCompression = (s: FieldCameraState): number =>
  s.surfaceBaseCompression;
export const selectSurfaceEndCompression = (s: FieldCameraState): number =>
  s.surfaceEndCompression;
export const selectFieldCameraRevision = (s: FieldCameraState): number => s.revision;

/** @deprecated use selectSurfaceBaseCompression */
export const selectSurfaceCompression = selectSurfaceBaseCompression;
