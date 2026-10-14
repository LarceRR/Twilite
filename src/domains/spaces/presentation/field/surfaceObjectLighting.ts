import { Frustum, Matrix4, Sphere, Vector3, type Camera } from 'three';

import { DEFAULT_FIELD_CONFIG, type FieldConfig } from './fieldConfig';

/**
 * Field coordinates are logical pixels, with 100 world units representing 1 metre.
 * Three.js evaluates inverse-square attenuation in its raw world-coordinate units,
 * so point-light intensity must be scaled by 100^2 to preserve physical illuminance.
 */
export const FIELD_WORLD_UNITS_PER_METER = 100;
export const FIELD_POINT_LIGHT_INTENSITY_SCALE = FIELD_WORLD_UNITS_PER_METER ** 2;

/** Convert the scene's artist-facing intensity to the scale expected by Three.js lights. */
export function resolveThreePointLightIntensity(intensity: number): number {
  if (!Number.isFinite(intensity)) return 0;
  return Math.max(0, intensity) * FIELD_POINT_LIGHT_INTENSITY_SCALE;
}

/** Light data accepted from the API or synthesized by the temporary test override. */
export type SurfaceObjectLightConfig = {
  readonly color: string;
  readonly intensity: number;
  readonly distance: number;
};

/** Identity and optional source metadata used to modulate the shared shadow layer. */
export type SurfaceObjectLightingIdentity = {
  readonly id: string;
  readonly light: Pick<SurfaceObjectLightConfig, 'intensity'> | null;
};

/** Return API settings when available; otherwise use the development glow override. */
export function resolveSurfaceObjectLightConfig(
  backendLight: SurfaceObjectLightConfig | null | undefined,
  config: FieldConfig['lighting']['objectGlow'] = DEFAULT_FIELD_CONFIG.lighting.objectGlow,
): SurfaceObjectLightConfig | null {
  if (config.forceAllObjectsForTesting) {
    return {
      color: config.fallbackColor,
      intensity: config.fallbackIntensity,
      distance: config.fallbackDistance,
    };
  }
  return backendLight ?? null;
}

/** Stable identity seed so each visible candle flickers independently. */
export function surfaceObjectFlickerSeed(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Reusable camera-frustum query for light-source culling without per-frame allocations. */
export class SurfaceObjectLightVisibility {
  private readonly frustum = new Frustum();
  private readonly projectionView = new Matrix4();
  private readonly bounds = new Sphere(new Vector3(), 0);

  updateCamera(camera: Camera): void {
    camera.updateMatrixWorld();
    this.projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projectionView);
  }

  intersects(x: number, y: number, z: number, radius: number): boolean {
    this.bounds.center.set(x, y, z);
    this.bounds.radius = Math.max(0, radius);
    return this.frustum.intersectsSphere(this.bounds);
  }
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

/** Stepwise, irregular candle-like flicker. Timing and amplitudes come from FieldConfig. */
export function candleFlickerMultiplier(
  elapsedMs: number,
  seed: number,
  config: FieldConfig['lighting']['objectGlow']['flicker'] =
    DEFAULT_FIELD_CONFIG.lighting.objectGlow.flicker,
): number {
  const time = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const slow = noise(seed, Math.floor(time / config.slowIntervalMs), 0x9e3779b1);
  const medium = noise(seed, Math.floor(time / config.mediumIntervalMs), 0x85ebca6b);
  const fast = noise(seed, Math.floor(time / config.fastIntervalMs), 0xc2b2ae35);
  const value =
    config.minMultiplier +
    slow * config.slowAmplitude +
    medium * config.mediumAmplitude +
    fast * config.fastAmplitude;
  return Math.round(value * config.roundingScale) / config.roundingScale;
}

/** Nearby local emitters gently fill the global directional shadow; each local light keeps its own spatial shadow map. */
export function resolveSceneShadowIntensity(
  lights: readonly SurfaceObjectLightingIdentity[],
  elapsedMs: number,
  config: FieldConfig['lighting'] = DEFAULT_FIELD_CONFIG.lighting,
): number {
  let weightedFlicker = 0;
  let totalIntensity = 0;
  for (const item of lights) {
    if (item.light === null || !Number.isFinite(item.light.intensity)) continue;
    const sourceIntensity = Math.max(0, item.light.intensity);
    if (sourceIntensity === 0) continue;
    weightedFlicker +=
      candleFlickerMultiplier(
        elapsedMs,
        surfaceObjectFlickerSeed(item.id),
        config.objectGlow.flicker,
      ) * sourceIntensity;
    totalIntensity += sourceIntensity;
  }
  if (totalIntensity === 0) return config.shadows.baselineIntensity;

  const averageFlicker = weightedFlicker / totalIntensity;
  const emissionStrength = Math.min(1, totalIntensity / config.shadows.emitterSaturationIntensity);
  return Math.max(
    config.shadows.minIntensity,
    Math.min(
      config.shadows.maxIntensity,
      config.shadows.baselineIntensity -
        averageFlicker * config.shadows.contrastScale * emissionStrength,
    ),
  );
}
