import { describe, expect, it } from 'vitest';
import { LinearFilter, NearestFilter } from 'three';

import {
  createFieldNoiseTexture,
  FIELD_GRASS_PALETTE,
  FIELD_SURFACE_UNIFORMS,
  FIELD_ALBEDO_NOISE_2_TEXTURE,
  FIELD_ALBEDO_NOISE_3_TEXTURE,
  FIELD_CLOUD_NOISE_TEXTURE,
  FIELD_WIND_NOISE_TEXTURE,
} from './fieldCloudShadows';

describe('author-matched field noise textures', () => {
  it('normalizes and seamlessly blends a FastNoiseLite texture into grayscale RGBA', () => {
    const texture = createFieldNoiseTexture(0, 0.01, 32);
    const { data, width, height } = texture.image as {
      readonly data: Uint8Array;
      readonly width: number;
      readonly height: number;
    };

    const pixels = data.length / 4;
    const redValues = new Set<number>();
    let minimum = 255;
    let maximum = 0;
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 4;
      const red = data[offset]!;
      minimum = Math.min(minimum, red);
      maximum = Math.max(maximum, red);
      redValues.add(red);
      expect(data[offset + 1]).toBe(red);
      expect(data[offset + 2]).toBe(red);
      expect(data[offset + 3]).toBe(255);
    }

    expect(width).toBe(32);
    expect(height).toBe(32);
    expect(maximum - minimum).toBeGreaterThan(150);
    expect(redValues.size).toBeGreaterThan(32);
    texture.dispose();
  });

  it('shares the exact author palette between grass and the surface material', () => {
    expect(FIELD_SURFACE_UNIFORMS.uFieldSurfaceAlbedo1.value).toBe(FIELD_GRASS_PALETTE.albedo1);
    expect(FIELD_SURFACE_UNIFORMS.uFieldSurfaceAlbedo2.value).toBe(FIELD_GRASS_PALETTE.albedo2);
    expect(FIELD_SURFACE_UNIFORMS.uFieldSurfaceAlbedo3.value).toBe(FIELD_GRASS_PALETTE.albedo3);
  });
  it('uses nearest sampling for wind and linear sampling for cloud and albedo maps', () => {
    expect(FIELD_WIND_NOISE_TEXTURE.magFilter).toBe(NearestFilter);
    expect(FIELD_WIND_NOISE_TEXTURE.minFilter).toBe(NearestFilter);
    expect(FIELD_CLOUD_NOISE_TEXTURE.magFilter).toBe(LinearFilter);
    expect(FIELD_CLOUD_NOISE_TEXTURE.minFilter).toBe(LinearFilter);
    expect(FIELD_ALBEDO_NOISE_2_TEXTURE.magFilter).toBe(LinearFilter);
    expect(FIELD_ALBEDO_NOISE_3_TEXTURE.magFilter).toBe(LinearFilter);
  });
});
