import { describe, expect, it } from 'vitest';

import {
  candleFlickerMultiplier,
  resolveSceneShadowIntensity,
  surfaceObjectFlickerSeed,
} from './surfaceObjectLighting';

describe('surfaceObjectLighting', () => {
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
