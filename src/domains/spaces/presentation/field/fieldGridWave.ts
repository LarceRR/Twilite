/** Max wave footprint around the cell center (world px). */
export const FIELD_WAVE_SIZE_PX = 96;

/** Half of SIZE — circle radius from center in world px. */
export const FIELD_WAVE_MAX_RADIUS_PX = FIELD_WAVE_SIZE_PX / 2;

/** Coarse “texel” size for a chunkier pixel-art wave. */
export const FIELD_WAVE_PIXEL_SIZE_PX = 4;

/** Max radius in coarse wave pixels. */
export const FIELD_WAVE_MAX_RADIUS_STEPS = Math.floor(
  FIELD_WAVE_MAX_RADIUS_PX / FIELD_WAVE_PIXEL_SIZE_PX,
);

/** Peak white mix at the rim (center is 0). */
export const FIELD_WAVE_MAX_ALPHA = 0.8;

/** Expand + fade length. */
export const FIELD_WAVE_DURATION_SEC = 0.48;

/** Life curve fractions of duration. */
export const FIELD_WAVE_FADE_IN_END = 0.08;
/** Later dissolve → slower fade; wave dies a bit larger while still growing. */
export const FIELD_WAVE_FADE_OUT_START = 0.55;

/** Concurrent waves supported by the shader (oldest is replaced if full). */
export const FIELD_WAVE_MAX_COUNT = 4;

/** Inactive slot marker for uStartTimes. */
export const FIELD_WAVE_SLOT_INACTIVE = -1;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function smoothstep01(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/** Quantize a world coordinate into coarse wave-pixel space. */
export function fieldWaveQuantize(
  worldCoord: number,
  pixelSizePx: number = FIELD_WAVE_PIXEL_SIZE_PX,
): number {
  return Math.floor(worldCoord / pixelSizePx);
}

/** Integer radius in coarse steps — grows for the full lifetime. */
export function fieldWaveRadius(
  elapsedSec: number,
  durationSec: number = FIELD_WAVE_DURATION_SEC,
  maxRadiusSteps: number = FIELD_WAVE_MAX_RADIUS_STEPS,
): number {
  if (elapsedSec <= 0 || durationSec <= 0 || maxRadiusSteps <= 0) return 0;
  const t = clamp01(elapsedSec / durationSec);
  // Mild ease-in; still reaches max only at the end (while already faded).
  const eased = t * t;
  return Math.floor(eased * maxRadiusSteps + 1e-6);
}

/**
 * Life fade: quick appear, slower dissolve while radius keeps growing
 * so max size is reached only as the wave is already soft.
 */
export function fieldWaveLifeFade(
  elapsedSec: number,
  durationSec: number = FIELD_WAVE_DURATION_SEC,
): number {
  if (elapsedSec < 0 || durationSec <= 0) return 0;
  if (elapsedSec >= durationSec) return 0;
  const fadeInEnd = durationSec * FIELD_WAVE_FADE_IN_END;
  const fadeOutStart = durationSec * FIELD_WAVE_FADE_OUT_START;
  const fadeIn = fadeInEnd <= 0 ? 1 : clamp01(elapsedSec / fadeInEnd);
  const fadeOut =
    elapsedSec <= fadeOutStart
      ? 1
      : 1 - clamp01((elapsedSec - fadeOutStart) / (durationSec - fadeOutStart));
  return smoothstep01(fadeIn) * smoothstep01(fadeOut);
}

/** Euclidean distance in coarse wave-pixel units. */
export function fieldWavePixelDist(dxSteps: number, dySteps: number): number {
  return Math.floor(Math.hypot(dxSteps, dySteps) + 1e-6);
}

/**
 * Radial gradient: center 0 → rim maxAlpha. Outside radius → 0.
 */
export function fieldWaveSampleOpacity(
  distSteps: number,
  radiusSteps: number,
  lifeFade: number,
  maxAlpha: number = FIELD_WAVE_MAX_ALPHA,
): number {
  if (lifeFade <= 0 || radiusSteps <= 0) return 0;
  if (distSteps > radiusSteps) return 0;
  return (distSteps / radiusSteps) * maxAlpha * lifeFade;
}

export function fieldWaveIsAlive(
  elapsedSec: number,
  durationSec: number = FIELD_WAVE_DURATION_SEC,
): boolean {
  return elapsedSec >= 0 && elapsedSec < durationSec;
}

/**
 * Pick a free/expired slot, otherwise the oldest active one.
 * `startTimes[i] < 0` means inactive.
 */
export function pickFieldWaveSlot(
  startTimes: readonly number[],
  nowSec: number,
  durationSec: number = FIELD_WAVE_DURATION_SEC,
): number {
  let oldestIndex = 0;
  let oldestStart = Number.POSITIVE_INFINITY;
  for (let i = 0; i < startTimes.length; i += 1) {
    const start = startTimes[i]!;
    if (start < 0 || nowSec - start >= durationSec) return i;
    if (start < oldestStart) {
      oldestStart = start;
      oldestIndex = i;
    }
  }
  return oldestIndex;
}

export function combineWaveOpacities(a: number, b: number): number {
  return Math.max(a, b);
}
