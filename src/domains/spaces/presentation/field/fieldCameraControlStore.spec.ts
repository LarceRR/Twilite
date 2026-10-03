import { beforeEach, describe, expect, it } from 'vitest';

import {
  resolveActiveWorldAxis,
  useFieldCameraControlStore,
} from './fieldCameraControlStore';

describe('fieldCameraControlStore', () => {
  beforeEach(() => {
    useFieldCameraControlStore.setState({
      ready: true,
      userAdjusted: false,
      position: { x: -469, y: 0, z: 408 },
      rotationDeg: { x: 70, y: 0, z: -90 },
      fov: 42,
      near: 1,
      far: 30_000,
      revision: 0,
      activeWorldAxis: null,
      activeAxisUntil: 0,
    });
  });

  it('pulses an active world axis for a short highlight window', () => {
    useFieldCameraControlStore.getState().pulseActiveWorldAxis('y');
    expect(useFieldCameraControlStore.getState().activeWorldAxis).toBe('y');
    expect(resolveActiveWorldAxis('y', Date.now() + 1000, Date.now())).toBe('y');
    expect(resolveActiveWorldAxis('y', Date.now() - 1, Date.now())).toBeNull();
  });

  it('hydrates framing until the user adjusts the camera', () => {
    useFieldCameraControlStore.getState().hydrateFromFraming({
      position: { x: 1, y: 2, z: 3 },
      rotationDeg: { x: 4, y: 5, z: 6 },
      fov: 42,
      near: 1,
      far: 900,
    });
    expect(useFieldCameraControlStore.getState().position).toEqual({ x: 1, y: 2, z: 3 });

    useFieldCameraControlStore.getState().setPosition({ x: 9, y: 9, z: 9 });
    useFieldCameraControlStore.getState().hydrateFromFraming({
      position: { x: 0, y: 0, z: 0 },
      rotationDeg: { x: 0, y: 0, z: 0 },
      fov: 42,
      near: 1,
      far: 900,
    });
    expect(useFieldCameraControlStore.getState().position).toEqual({ x: 9, y: 9, z: 9 });
    expect(useFieldCameraControlStore.getState().userAdjusted).toBe(true);
  });
});
