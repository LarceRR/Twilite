import { describe, expect, it } from 'vitest';

import {
  applyCameraAxisStep,
  applyCompressionStep,
  applyFocalLengthStep,
  cameraBasis,
  lookAtFromPose,
  poseFromPositionLookAt,
} from './fieldCameraPose';

describe('fieldCameraPose', () => {
  it('recovers look direction from default position/lookAt', () => {
    const pose = poseFromPositionLookAt(
      { x: 0, y: 2.35, z: 6.4 },
      { x: 0, y: 0.6, z: -4 },
      46,
    );
    const lookAt = lookAtFromPose(pose);
    const dx = lookAt.x - pose.position.x;
    const dy = lookAt.y - pose.position.y;
    const dz = lookAt.z - pose.position.z;
    const len = Math.hypot(dx, dy, dz);
    expect(dx / len).toBeCloseTo(0, 2);
    expect(dy / len).toBeLessThan(0);
    expect(dz / len).toBeLessThan(0);
  });

  it('moves forward along the look axis', () => {
    const pose = poseFromPositionLookAt({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }, 46);
    const next = applyCameraAxisStep(pose, 'move', 'forward');
    expect(next.position.z).toBeLessThan(pose.position.z);
  });

  it('yaws left/right in rotate mode', () => {
    const pose = poseFromPositionLookAt({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }, 46);
    const left = applyCameraAxisStep(pose, 'rotate', 'left');
    const right = applyCameraAxisStep(pose, 'rotate', 'right');
    expect(left.yaw).toBeGreaterThan(pose.yaw);
    expect(right.yaw).toBeLessThan(pose.yaw);
  });

  it('steps focal length without a tight ceiling', () => {
    expect(applyFocalLengthStep(40, 1)).toBe(42);
    expect(applyFocalLengthStep(40, -1)).toBe(38);
    expect(applyFocalLengthStep(9000, 1)).toBeGreaterThan(9000);
  });

  it('lets compression grow and shrink past 0..1', () => {
    expect(applyCompressionStep(0.2, 1)).toBeGreaterThan(0.2);
    expect(applyCompressionStep(0.2, -1)).toBeLessThan(0.2);
    expect(applyCompressionStep(0, -1)).toBeLessThan(0);
    expect(applyCompressionStep(1, 1)).toBeGreaterThan(1);
  });

  it('builds an orthonormal-ish basis', () => {
    const { forward, right, up } = cameraBasis(0, 0);
    expect(forward.z).toBeCloseTo(-1, 5);
    expect(Math.hypot(right.x, right.y, right.z)).toBeCloseTo(1, 5);
    expect(Math.hypot(up.x, up.y, up.z)).toBeCloseTo(1, 5);
  });
});
