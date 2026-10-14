import { describe, expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';

import {
  candleFlickerMultiplier,
  resolveSceneShadowIntensity,
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
      [{ id: 'bright', light: { intensity: 1 } }],
      800,
    );
    expect(withoutLights).toBe(0.42);
    expect(oneLight).toBeGreaterThan(0.2);
    expect(oneLight).toBeLessThanOrEqual(0.82);
  });
});
