import { describe, expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';

import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import {
  candleFlickerMultiplier,
  resolveSceneShadowIntensity,
  resolveSurfaceObjectLightConfig,
  SurfaceObjectLightVisibility,
  surfaceObjectFlickerSeed,
} from './surfaceObjectLighting';

describe('surfaceObjectLighting', () => {
  it('culls a source outside the camera frustum while retaining sources inside it', () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const visibility = new SurfaceObjectLightVisibility();
    visibility.updateCamera(camera);

    expect(visibility.intersects(0, 0, 0, 1)).toBe(true);
    expect(visibility.intersects(1000, 0, 0, 1)).toBe(false);
  });

  it('uses configured fallback light for every object while test override is enabled', () => {
    const config = DEFAULT_FIELD_CONFIG.lighting.objectGlow;
    expect(config.forceAllObjectsForTesting).toBe(true);
    expect(resolveSurfaceObjectLightConfig(null, config)).toEqual({
      color: config.fallbackColor,
      intensity: config.fallbackIntensity,
      distance: config.fallbackDistance,
    });
    expect(
      resolveSurfaceObjectLightConfig(
        { color: '#FF5911', intensity: 0.5, distance: 100 },
        { ...config, forceAllObjectsForTesting: false },
      ),
    ).toEqual({ color: '#FF5911', intensity: 0.5, distance: 100 });
    expect(resolveSurfaceObjectLightConfig(null, {
      ...config,
      forceAllObjectsForTesting: false,
    })).toBeNull();
  });

  it('creates stable seeds for object identities', () => {
    expect(surfaceObjectFlickerSeed('torch-1')).toBe(surfaceObjectFlickerSeed('torch-1'));
    expect(surfaceObjectFlickerSeed('torch-1')).not.toBe(surfaceObjectFlickerSeed('torch-2'));
  });

  it('produces deterministic but irregular brightness changes in a safe range', () => {
    const seed = surfaceObjectFlickerSeed('torch-1');
    const sequence = Array.from({ length: 50 }, (_, index) =>
      candleFlickerMultiplier(index * 25, seed),
    );
    expect(candleFlickerMultiplier(250, seed)).toBe(candleFlickerMultiplier(250, seed));
    expect(new Set(sequence).size).toBeGreaterThan(5);
    expect(Math.min(...sequence)).toBeGreaterThanOrEqual(0.58);
    expect(Math.max(...sequence)).toBeLessThanOrEqual(1.11);
  });

  it('raises shared shadow contrast with brighter emitters and uses a neutral baseline without lights', () => {
    const withoutLights = resolveSceneShadowIntensity([], 800);
    const oneLight = resolveSceneShadowIntensity(
      [{ id: 'same-light', light: { intensity: 1 } }],
      800,
    );
    const dimLight = resolveSceneShadowIntensity(
      [{ id: 'same-light', light: { intensity: 0.1 } }],
      800,
    );
    const brightLight = resolveSceneShadowIntensity(
      [{ id: 'same-light', light: { intensity: 4 } }],
      800,
    );
    const baseline = DEFAULT_FIELD_CONFIG.lighting.shadows.baselineIntensity;
    expect(withoutLights).toBe(baseline);
    expect(oneLight).toBeGreaterThan(baseline);
    expect(oneLight).toBeLessThanOrEqual(0.82);
    expect(dimLight).toBeLessThan(brightLight);
  });
});
