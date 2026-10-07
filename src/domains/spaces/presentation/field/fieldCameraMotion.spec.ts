import { describe, expect, it } from 'vitest';

import {
  CAMERA_HOLD_MAX_STEP,
  cameraNeedsProjectionUpdate,
  formatCameraHud,
  holdRepeatDelta,
  moveCameraPosition,
  nextRotateAxis,
  rotateCameraEuler,
  shouldPublishThrottled,
  worldAxisFromMove,
} from './fieldCameraMotion';

describe('fieldCameraMotion', () => {
  it('moves in Z-up space (up/down = Z, forward/back = Y)', () => {
    const origin = { x: 0, y: 0, z: 0 };
    expect(moveCameraPosition(origin, 'left', 1)).toEqual({ x: -1, y: 0, z: 0 });
    expect(moveCameraPosition(origin, 'right', 1)).toEqual({ x: 1, y: 0, z: 0 });
    expect(moveCameraPosition(origin, 'up', 1)).toEqual({ x: 0, y: 0, z: 1 });
    expect(moveCameraPosition(origin, 'down', 1)).toEqual({ x: 0, y: 0, z: -1 });
    expect(moveCameraPosition(origin, 'forward', 1)).toEqual({ x: 0, y: 1, z: 0 });
    expect(moveCameraPosition(origin, 'back', 1)).toEqual({ x: 0, y: -1, z: 0 });
  });

  it('rotates by the selected axis and cycles X→Y→Z', () => {
    expect(rotateCameraEuler({ x: 0, y: 0, z: 0 }, 'x', 1)).toEqual({ x: 1, y: 0, z: 0 });
    expect(rotateCameraEuler({ x: 0, y: 0, z: 0 }, 'y', -2)).toEqual({ x: 0, y: -2, z: 0 });
    expect(nextRotateAxis('x')).toBe('y');
    expect(nextRotateAxis('y')).toBe('z');
    expect(nextRotateAxis('z')).toBe('x');
  });

  it('ramps hold delta from 1 to the configured max', () => {
    expect(holdRepeatDelta(0)).toBe(1);
    expect(holdRepeatDelta(750)).toBeGreaterThan(1);
    expect(holdRepeatDelta(1500)).toBe(CAMERA_HOLD_MAX_STEP);
    expect(holdRepeatDelta(99999)).toBe(CAMERA_HOLD_MAX_STEP);
  });

  it('maps move directions onto Z-up world axes', () => {
    expect(worldAxisFromMove('right')).toBe('x');
    expect(worldAxisFromMove('up')).toBe('z');
    expect(worldAxisFromMove('forward')).toBe('y');
  });

  it('formats a compact HUD block', () => {
    const hud = formatCameraHud({
      position: { x: 1.25, y: 2, z: -3 },
      rotationDeg: { x: 10, y: 20, z: 30 },
      fov: 42,
      near: 1,
      far: 1000,
    });
    expect(hud).toContain('pos.x 1.3');
    expect(hud).toContain('rot.y 20.0');
    expect(hud).toContain('fov 42');
  });

  it('throttles HUD publish cadence', () => {
    expect(shouldPublishThrottled(100, 0, 100)).toBe(true);
    expect(shouldPublishThrottled(199, 100, 100)).toBe(false);
    expect(shouldPublishThrottled(200, 100, 100)).toBe(true);
  });

  it('detects when projection optics actually change', () => {
    const cam = { fov: 42, near: 1, far: 1000 };
    expect(cameraNeedsProjectionUpdate(cam, cam)).toBe(false);
    expect(cameraNeedsProjectionUpdate(cam, { ...cam, fov: 50 })).toBe(true);
  });
});
