export type SurfaceObjectLightingIdentity = {
  readonly id: string;
  readonly light: { readonly intensity: number } | null;
};

/** Stable identity seed so each visible candle flickers independently. */
export function surfaceObjectFlickerSeed(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function noise(seed: number, bucket: number, salt: number): number {
  let value = (seed ^ Math.imul(bucket + 1, salt)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

/**
 * Stepwise, irregular candle-like flicker. It is deterministic for a given
 * object/time so the light and its stylized shadow share the same modulation.
 */
export function candleFlickerMultiplier(elapsedMs: number, seed: number): number {
  const time = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const slow = noise(seed, Math.floor(time / 113), 0x9e3779b1);
  const medium = noise(seed, Math.floor(time / 47), 0x85ebca6b);
  const fast = noise(seed, Math.floor(time / 23), 0xc2b2ae35);
  const value = 0.58 + slow * 0.22 + medium * 0.18 + fast * 0.13;
  return Math.round(value * 100) / 100;
}

/** Shared key-light shadow contrast tracks the average visible candle flicker. */
export function resolveSceneShadowIntensity(
  lights: readonly SurfaceObjectLightingIdentity[],
  elapsedMs: number,
): number {
  const emitting = lights.filter((item) => item.light !== null);
  if (emitting.length === 0) return 0.42;

  const average = emitting.reduce(
    (sum, item) => sum + candleFlickerMultiplier(elapsedMs, surfaceObjectFlickerSeed(item.id)),
    0,
  ) / emitting.length;

  return Math.max(0.2, Math.min(0.82, 0.2 + average * 0.55));
}
