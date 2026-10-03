import { create } from 'zustand';

import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import { FIELD_CAMERA_DEFAULT_POSE } from './fieldCameraFraming';
import type { Vec3, WorldAxis } from './fieldCameraMotion';

/** How long an axis stays highlighted after the last move/rotate pulse. */
export const ACTIVE_AXIS_HIGHLIGHT_MS =
  DEFAULT_FIELD_CONFIG.camera.activeAxisHighlightMs;

export type FieldCameraControlState = {
  readonly ready: boolean;
  readonly userAdjusted: boolean;
  readonly position: Vec3;
  readonly rotationDeg: Vec3;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
  readonly revision: number;
  readonly activeWorldAxis: WorldAxis | null;
  readonly activeAxisUntil: number;
  hydrateFromFraming: (pose: {
    readonly position: Vec3;
    readonly rotationDeg: Vec3;
    readonly fov: number;
    readonly near: number;
    readonly far: number;
  }) => void;
  setPosition: (position: Vec3) => void;
  setRotationDeg: (rotationDeg: Vec3) => void;
  pulseActiveWorldAxis: (axis: WorldAxis) => void;
  markUserAdjusted: () => void;
};

export function resolveActiveWorldAxis(
  axis: WorldAxis | null,
  until: number,
  now: number = Date.now(),
): WorldAxis | null {
  if (axis == null || now >= until) return null;
  return axis;
}

export const useFieldCameraControlStore = create<FieldCameraControlState>()((set) => ({
  ready: true,
  userAdjusted: false,
  position: FIELD_CAMERA_DEFAULT_POSE.position,
  rotationDeg: FIELD_CAMERA_DEFAULT_POSE.rotationDeg,
  fov: FIELD_CAMERA_DEFAULT_POSE.fov,
  near: FIELD_CAMERA_DEFAULT_POSE.near,
  far: FIELD_CAMERA_DEFAULT_POSE.far,
  revision: 0,
  activeWorldAxis: null,
  activeAxisUntil: 0,
  hydrateFromFraming: (pose) =>
    set((state) => {
      if (state.userAdjusted) return state;
      return {
        ready: true,
        position: pose.position,
        rotationDeg: pose.rotationDeg,
        fov: pose.fov,
        near: pose.near,
        far: pose.far,
        revision: state.revision + 1,
      };
    }),
  setPosition: (position) =>
    set((state) => ({
      position,
      userAdjusted: true,
      ready: true,
      revision: state.revision + 1,
    })),
  setRotationDeg: (rotationDeg) =>
    set((state) => ({
      rotationDeg,
      userAdjusted: true,
      ready: true,
      revision: state.revision + 1,
    })),
  pulseActiveWorldAxis: (axis) =>
    set({
      activeWorldAxis: axis,
      activeAxisUntil:
        Date.now() + getFieldConfig().camera.activeAxisHighlightMs,
    }),
  markUserAdjusted: () => set({ userAdjusted: true }),
}));
