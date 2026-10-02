/** Blender default full-frame sensor width (mm). */
export const BLENDER_FILM_GAUGE_MM = 36;

export const FOCAL_LENGTH_MIN_MM = 0.5;
export const FOCAL_LENGTH_MAX_MM = 10_000;

/**
 * Three.js PerspectiveCamera focal-length ↔ vertical FOV, matching
 * `setFocalLength` / `getFocalLength` with the given film gauge and aspect.
 *
 * @see https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.setFocalLength
 */
export function filmHeightMm(filmGaugeMm: number, aspect: number): number {
  return filmGaugeMm / Math.max(aspect, 1);
}

export function fovDegFromFocalLengthMm(
  focalLengthMm: number,
  filmGaugeMm: number,
  aspect: number,
): number {
  const safeFocal = Math.max(focalLengthMm, 0.001);
  const vExtentSlope = (0.5 * filmHeightMm(filmGaugeMm, aspect)) / safeFocal;
  return (180 / Math.PI) * 2 * Math.atan(vExtentSlope);
}

export function focalLengthMmFromFovDeg(
  fovDeg: number,
  filmGaugeMm: number,
  aspect: number,
): number {
  const vExtentSlope = Math.tan((Math.PI / 180) * 0.5 * fovDeg);
  return (0.5 * filmHeightMm(filmGaugeMm, aspect)) / Math.max(vExtentSlope, 1e-8);
}

/** Soft safety only — wide range for live tuning. */
export function clampFocalLengthMm(focalLengthMm: number): number {
  return Math.min(FOCAL_LENGTH_MAX_MM, Math.max(FOCAL_LENGTH_MIN_MM, focalLengthMm));
}
