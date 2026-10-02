import { describe, expect, it } from 'vitest';

import {
  BLENDER_FILM_GAUGE_MM,
  clampFocalLengthMm,
  FOCAL_LENGTH_MAX_MM,
  FOCAL_LENGTH_MIN_MM,
  focalLengthMmFromFovDeg,
  fovDegFromFocalLengthMm,
} from './fieldCameraOptics';

describe('fieldCameraOptics', () => {
  it('round-trips FOV ↔ focal length like Three.js setFocalLength', () => {
    const aspect = 16 / 9;
    const focal = 50;
    const fov = fovDegFromFocalLengthMm(focal, BLENDER_FILM_GAUGE_MM, aspect);
    const back = focalLengthMmFromFovDeg(fov, BLENDER_FILM_GAUGE_MM, aspect);
    expect(back).toBeCloseTo(focal, 5);
  });

  it('longer focal length narrows FOV (Blender zoom-in)', () => {
    const wide = fovDegFromFocalLengthMm(24, BLENDER_FILM_GAUGE_MM, 1);
    const tele = fovDegFromFocalLengthMm(85, BLENDER_FILM_GAUGE_MM, 1);
    expect(tele).toBeLessThan(wide);
  });

  it('only applies a soft focal safety range', () => {
    expect(clampFocalLengthMm(0)).toBe(FOCAL_LENGTH_MIN_MM);
    expect(clampFocalLengthMm(50_000)).toBe(FOCAL_LENGTH_MAX_MM);
    expect(clampFocalLengthMm(50)).toBe(50);
  });
});
