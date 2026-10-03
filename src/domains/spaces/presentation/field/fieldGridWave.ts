import {
  DEFAULT_FIELD_CONFIG,
  fieldWaveMaxRadiusPx,
  fieldWaveMaxRadiusSteps,
} from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';

/** Max wave footprint around the cell center (world px). */
export const FIELD_WAVE_SIZE_PX = DEFAULT_FIELD_CONFIG.wave.sizePx;

/** Half of SIZE — circle radius from center in world px. */
export const FIELD_WAVE_MAX_RADIUS_PX = fieldWaveMaxRadiusPx(DEFAULT_FIELD_CONFIG.wave);

/** Coarse “texel” size for a chunkier pixel-art wave. */
export const FIELD_WAVE_PIXEL_SIZE_PX = DEFAULT_FIELD_CONFIG.wave.pixelSizePx;

/** Max radius in coarse wave pixels. */
export const FIELD_WAVE_MAX_RADIUS_STEPS = fieldWaveMaxRadiusSteps(
  DEFAULT_FIELD_CONFIG.wave,
);

/** Peak white mix at the rim (center is 0). */
export const FIELD_WAVE_MAX_ALPHA = DEFAULT_FIELD_CONFIG.wave.maxAlpha;

/** Expand + fade length. */
export const FIELD_WAVE_DURATION_SEC = DEFAULT_FIELD_CONFIG.wave.durationSec;

/** Life curve fractions of duration. */
export const FIELD_WAVE_FADE_IN_END = DEFAULT_FIELD_CONFIG.wave.fadeInEnd;
/** Later dissolve → slower fade; wave dies a bit larger while still growing. */
export const FIELD_WAVE_FADE_OUT_START = DEFAULT_FIELD_CONFIG.wave.fadeOutStart;

/**
 * Concurrent waves supported by the shader (oldest is replaced if full).
 * Must stay in sync with GLSL `#define WAVE_COUNT`.
 */
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
  pixelSizePx?: number,
): number {
  const size = pixelSizePx ?? getFieldConfig().wave.pixelSizePx;
  return Math.floor(worldCoord / size);
}

/** Integer radius in coarse steps — grows for the full lifetime. */
export function fieldWaveRadius(
  elapsedSec: number,
  durationSec?: number,
  maxRadiusSteps?: number,
): number {
  const wave = getFieldConfig().wave;
  const duration = durationSec ?? wave.durationSec;
  const maxSteps = maxRadiusSteps ?? fieldWaveMaxRadiusSteps(wave);
  if (elapsedSec <= 0 || duration <= 0 || maxSteps <= 0) return 0;
  const t = clamp01(elapsedSec / duration);
  const eased = t * t;
  return Math.floor(eased * maxSteps + 1e-6);
}

/**
 * Life fade: quick appear, slower dissolve while radius keeps growing
 * so max size is reached only as the wave is already soft.
 */
export function fieldWaveLifeFade(
  elapsedSec: number,
  durationSec?: number,
): number {
  const wave = getFieldConfig().wave;
  const duration = durationSec ?? wave.durationSec;
  if (elapsedSec < 0 || duration <= 0) return 0;
  if (elapsedSec >= duration) return 0;
  const fadeInEnd = duration * wave.fadeInEnd;
  const fadeOutStart = duration * wave.fadeOutStart;
  const fadeIn = fadeInEnd <= 0 ? 1 : clamp01(elapsedSec / fadeInEnd);
  const fadeOut =
    elapsedSec <= fadeOutStart
      ? 1
      : 1 - clamp01((elapsedSec - fadeOutStart) / (duration - fadeOutStart));
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
  maxAlpha?: number,
): number {
  const alpha = maxAlpha ?? getFieldConfig().wave.maxAlpha;
  if (lifeFade <= 0 || radiusSteps <= 0) return 0;
  if (distSteps > radiusSteps) return 0;
  return (distSteps / radiusSteps) * alpha * lifeFade;
}

export function fieldWaveIsAlive(
  elapsedSec: number,
  durationSec?: number,
): boolean {
  const duration = durationSec ?? getFieldConfig().wave.durationSec;
  return elapsedSec >= 0 && elapsedSec < duration;
}

/**
 * Pick a free/expired slot, otherwise the oldest active one.
 * `startTimes[i] < 0` means inactive.
 */
export function pickFieldWaveSlot(
  startTimes: readonly number[],
  nowSec: number,
  durationSec?: number,
): number {
  const duration = durationSec ?? getFieldConfig().wave.durationSec;
  let oldestIndex = 0;
  let oldestStart = Number.POSITIVE_INFINITY;
  for (let i = 0; i < startTimes.length; i += 1) {
    const start = startTimes[i]!;
    if (start < 0 || nowSec - start >= duration) return i;
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
