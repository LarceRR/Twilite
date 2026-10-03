import { describe, expect, it } from 'vitest';

import {
  FIELD_CAMERA_DEFAULT_POSE,
  computeFieldCameraPose,
  distanceToFitFieldPlane,
} from './fieldCameraFraming';

describe('fieldCameraFraming', () => {
  it('locks the tuned default camera pose', () => {
    expect(FIELD_CAMERA_DEFAULT_POSE).toEqual({
      position: { x: -469, y: 0, z: 408 },
      rotationDeg: { x: 70, y: 0, z: -90 },
      fov: 42,
      near: 1,
      far: 30_000,
    });
  });

  it('pulls the camera farther on narrow (portrait) aspects', () => {
    const base = {
      width: 3000,
      depth: 600,
      fovDeg: 42,
      margin: 1.18,
    };
    const portrait = distanceToFitFieldPlane({ ...base, aspect: 0.5 });
    const landscape = distanceToFitFieldPlane({ ...base, aspect: 2 });
    expect(portrait).toBeGreaterThan(landscape);
  });

  it('stands on −Y and elevates along +Z toward the deck center', () => {
    const pose = computeFieldCameraPose({
      width: 3000,
      depth: 600,
      fovDeg: 42,
      aspect: 0.5,
      elevationDeg: 58,
    });
    expect(pose.target).toEqual([1500, 0, 0]);
    expect(pose.position[0]).toBe(1500);
    expect(pose.position[1]).toBeLessThan(pose.target[1]!);
    expect(pose.position[2]).toBeGreaterThan(0);
  });
});
