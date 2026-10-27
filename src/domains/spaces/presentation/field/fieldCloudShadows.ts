import {
  Color,
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  Vector2,
  Vector3,
} from 'three';

import FastNoiseLite from './vendor/FastNoiseLite.js';

/** Godot NoiseTexture2D defaults to 512 × 512 with a 0.1 seamless blend skirt. */
const GODOT_NOISE_TEXTURE_SIZE = 512;
const GODOT_NOISE_SEAMLESS_SKIRT = 0.1;
const NOISE_TEXTURE_SIZE = 128;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, weight: number): number {
  return a + (b - a) * weight;
}

/**
 * Generate a compact, seamless equivalent of Godot NoiseTexture2D using the
 * same FastNoiseLite OpenSimplex2S noise type, seed and resource frequency.
 *
 * We bake 128 × 128 instead of Godot's 512 × 512 to reduce mobile GPU memory.
 * Sampling coordinates still cover the original 512 × 512 noise domain, so the
 * world-space feature scale remains the same. The seamless edge blend mirrors
 * Godot's default skirt rather than introducing a repeating-grid pattern.
 */
export function createFieldNoiseTexture(
  seed: number,
  frequency = 0.01,
  size = NOISE_TEXTURE_SIZE,
): DataTexture {
  const noise = new FastNoiseLite(seed);
  noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2S);
  noise.SetFrequency(frequency);

  const sample = (x: number, y: number): number =>
    Math.max(0, Math.min(1, noise.GetNoise(x, y) * 0.5 + 0.5));

  const sampleWithSeamlessX = (x: number, y: number, u: number): number => {
    const value = sample(x, y);
    const skirt = GODOT_NOISE_SEAMLESS_SKIRT;
    if (u < skirt) {
      return mix(
        sample(x + GODOT_NOISE_TEXTURE_SIZE, y),
        value,
        smoothstep(0, skirt, u),
      );
    }
    if (u > 1 - skirt) {
      return mix(
        sample(x - GODOT_NOISE_TEXTURE_SIZE, y),
        value,
        smoothstep(0, skirt, 1 - u),
      );
    }
    return value;
  };

  const data = new Uint8Array(size * size * 4);
  const sourcePerPixel = GODOT_NOISE_TEXTURE_SIZE / size;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const sourceX = (x + 0.5) * sourcePerPixel;
      const sourceY = (y + 0.5) * sourcePerPixel;
      const atY = (sampleY: number): number =>
        sampleWithSeamlessX(sourceX, sampleY, u);

      const value = v < GODOT_NOISE_SEAMLESS_SKIRT
        ? mix(
            atY(sourceY + GODOT_NOISE_TEXTURE_SIZE),
            atY(sourceY),
            smoothstep(0, GODOT_NOISE_SEAMLESS_SKIRT, v),
          )
        : v > 1 - GODOT_NOISE_SEAMLESS_SKIRT
          ? mix(
              atY(sourceY - GODOT_NOISE_TEXTURE_SIZE),
              atY(sourceY),
              smoothstep(0, GODOT_NOISE_SEAMLESS_SKIRT, 1 - v),
            )
          : atY(sourceY);

      const channel = Math.round(Math.max(0, Math.min(1, value)) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = channel;
      data[offset + 1] = channel;
      data[offset + 2] = channel;
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// These match the seeds and FastNoiseLite frequencies in the author's .tres resources.
export const FIELD_WIND_NOISE_TEXTURE = createFieldNoiseTexture(0, 0.01);
export const FIELD_CLOUD_NOISE_TEXTURE = createFieldNoiseTexture(0, 0.01);
export const FIELD_ALBEDO_NOISE_2_TEXTURE = createFieldNoiseTexture(0, 0.0046);
export const FIELD_ALBEDO_NOISE_3_TEXTURE = createFieldNoiseTexture(1, 0.0052);

export const FIELD_SURFACE_UNIFORMS = {
  uFieldSurfaceNoise2: { value: FIELD_ALBEDO_NOISE_2_TEXTURE },
  uFieldSurfaceNoise3: { value: FIELD_ALBEDO_NOISE_3_TEXTURE },
  uFieldSurfaceScale2: { value: 0.0011 },
  uFieldSurfaceThreshold2: { value: 0.537 },
  uFieldSurfaceScale3: { value: 0.001 },
  uFieldSurfaceThreshold3: { value: 0.471 },
  uFieldSurfaceAlbedo1: { value: new Color(0x71a200) },
  uFieldSurfaceAlbedo2: { value: new Color(0x8ead36) },
  uFieldSurfaceAlbedo3: { value: new Color(0x80a739) },
};

export const FIELD_SURFACE_FRAGMENT_DECLARATIONS = [
  'uniform sampler2D uFieldSurfaceNoise2;',
  'uniform sampler2D uFieldSurfaceNoise3;',
  'uniform float uFieldSurfaceScale2;',
  'uniform float uFieldSurfaceThreshold2;',
  'uniform float uFieldSurfaceScale3;',
  'uniform float uFieldSurfaceThreshold3;',
  'uniform vec3 uFieldSurfaceAlbedo1;',
  'uniform vec3 uFieldSurfaceAlbedo2;',
  'uniform vec3 uFieldSurfaceAlbedo3;',
].join('\n');

/**
 * Cloud-shadow settings from Demo.tscn. Twilite uses 100 world units per metre,
 * so the source 40 m cloud scale and 50 m cloud height become 4000 and 5000.
 */
export const FIELD_CLOUD_UNIFORMS = {
  uCloudNoise: { value: FIELD_CLOUD_NOISE_TEXTURE },
  uCloudTime: { value: 0 },
  uCloudScale: { value: 4000 },
  uCloudWorldHeight: { value: 5000 },
  uCloudSpeed: { value: -0.01 },
  uCloudContrast: { value: 3.845 },
  uCloudThreshold: { value: 0.27 },
  uCloudDirection: { value: new Vector2(0, -1) },
  uCloudLightDirection: { value: new Vector3(-160, 260, 420).normalize() },
  uCloudShadowMin: { value: 0.2 },
  uCloudDivergeAngle: { value: 20 },
};

export const FIELD_CLOUD_FRAGMENT_DECLARATIONS = [
  'uniform sampler2D uCloudNoise;',
  'uniform float uCloudTime;',
  'uniform float uCloudScale;',
  'uniform float uCloudWorldHeight;',
  'uniform float uCloudSpeed;',
  'uniform float uCloudContrast;',
  'uniform float uCloudThreshold;',
  'uniform vec2 uCloudDirection;',
  'uniform vec3 uCloudLightDirection;',
  'uniform float uCloudShadowMin;',
  'uniform float uCloudDivergeAngle;',
  'vec2 fieldCloudRotate(vec2 vector, float degrees) {',
  '  float angle = degrees * (3.141592653589793 / 180.0);',
  '  float c = cos(angle);',
  '  float s = sin(angle);',
  '  return vec2(vector.x * c - vector.y * s, vector.x * s + vector.y * c);',
  '}',
  'float fieldCloudVisibility(vec3 worldPosition) {',
  '  float lightVertical = uCloudLightDirection.z;',
  '  if (abs(lightVertical) < 0.0001) return 1.0;',
  '  float distanceToCloud = (uCloudWorldHeight - worldPosition.z) / lightVertical;',
  '  if (distanceToCloud < 0.0) return 1.0;',
  '  vec3 hitPosition = worldPosition + distanceToCloud * uCloudLightDirection;',
  '  vec2 direction1 = fieldCloudRotate(uCloudDirection, uCloudDivergeAngle);',
  '  vec2 direction2 = fieldCloudRotate(uCloudDirection, -uCloudDivergeAngle);',
  '  vec2 offset1 = uCloudTime * uCloudSpeed * normalize(direction1);',
  '  vec2 offset2 = uCloudTime * uCloudSpeed * normalize(direction2);',
  '  float sample1 = texture2D(uCloudNoise, hitPosition.xy / max(uCloudScale, 0.001) + offset1).r;',
  '  float sample2 = texture2D(uCloudNoise, hitPosition.xy / (max(uCloudScale, 0.001) * 0.8) + offset2 * (0.89 * 3.141592653589793 / 3.0)).r;',
  '  float visibility = clamp(sample1 * sample2 + uCloudThreshold, 0.0, 1.0);',
  '  visibility = (visibility - 0.5) * uCloudContrast + 0.5;',
  '  return clamp(visibility + uCloudThreshold, uCloudShadowMin, 1.0);',
  '}',
].join('\n');

export function syncFieldCloudTime(elapsedTimeSec: number): void {
  FIELD_CLOUD_UNIFORMS.uCloudTime.value = elapsedTimeSec;
}

/**
 * Project the cloud plane along the direction from the field toward the light.
 * A line and its inverse describe the same projection; here we keep the Z
 * component positive so the intersection test has a stable sign.
 */
export function syncFieldCloudLightDirection(
  direction: readonly [number, number, number],
): void {
  const light = FIELD_CLOUD_UNIFORMS.uCloudLightDirection.value;
  light.set(direction[0], direction[1], Math.abs(direction[2]));
  if (light.lengthSq() < 0.0001) {
    light.set(-160, 260, 420);
  }
  light.normalize();
}
