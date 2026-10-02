import { describe, expect, it } from 'vitest';

import {
  createDefaultFieldCameraPose,
  FIELD_CAMERA,
  FIELD_CAMERA_START,
} from './fieldCameraDefaults';
import { lookAtFromPose } from './fieldCameraPose';

describe('FIELD_CAMERA_START', () => {
  it('seeds the tuned Space framing on launch', () => {
    const pose = createDefaultFieldCameraPose();
    expect(pose.position).toEqual(FIELD_CAMERA_START.position);
    expect(pose.focalLengthMm).toBe(40.4);
    expect((pose.pitch * 180) / Math.PI).toBeCloseTo(-6.6, 5);
    expect(pose.yaw).toBe(0);
    expect(pose.roll).toBe(0);
    expect(FIELD_CAMERA_START.surfaceBaseCompression).toBe(1);
    expect(FIELD_CAMERA_START.surfaceEndCompression).toBe(0);
    expect(FIELD_CAMERA.lookAt).toEqual(lookAtFromPose(pose));
  });
});
