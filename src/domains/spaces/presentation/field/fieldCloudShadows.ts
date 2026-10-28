import {
  Color,
  DataTexture,
  LinearFilter,
  NoColorSpace,
  NearestFilter,
  RGBAFormat,
  RepeatWrapping,
  Vector2,
  Vector3,
} from 'three';

import { DEFAULT_FIELD_CONFIG } from './fieldConfig';
import FastNoiseLite from './vendor/FastNoiseLite.js';

/** Godot NoiseTexture2D defaults to 512×512, normalize=true, and seamless blend skirt=0.1. */
const GODOT_NOISE_TEXTURE_SIZE = 512;
const GODOT_NOISE_SEAMLESS_SKIRT = 0.1;
const NOISE_TEXTURE_SIZE = 128;

type NoiseSourceMode = 'default' | 'x' | 'y' | 'xy';

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function godotAlphaBlend(background: number, foreground: number, alpha: number): number {
  return (((alpha + 1) * foreground + (256 - alpha) * background) >> 8) & 255;
}

/**
 * Reproduce Godot NoiseTexture2D's normalized FastNoiseLite map and seamless
 * quadrant-swapping skirt. The 128² output samples the same 512² noise domain,
 * preserving the source's world-space scale without allocating 512² maps on mobile.
 */
export function createFieldNoiseTexture(
  seed: number,
  frequency = 0.01,
  size = NOISE_TEXTURE_SIZE,
): DataTexture {
  const noise = new FastNoiseLite(seed);
  noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2S);
  noise.SetFrequency(frequency);

  const skirtWidth = Math.max(1, Math.floor(size * GODOT_NOISE_SEAMLESS_SKIRT));
  const skirtHeight = Math.max(1, Math.floor(size * GODOT_NOISE_SEAMLESS_SKIRT));
  const sourceWidth = size + skirtWidth;
  const sourceHeight = size + skirtHeight;
  const halfWidth = Math.floor(size * 0.5);
  const halfHeight = Math.floor(size * 0.5);
  const skirtEdgeX = halfWidth + skirtWidth;
  const skirtEdgeY = halfHeight + skirtHeight;
  const sourceScale = GODOT_NOISE_TEXTURE_SIZE / size;

  // Godot normalize=true finds extrema over the whole source image, including
  // the seamless skirt, then maps min→0 and max→255. Match that rather than
  // assuming FastNoiseLite always spans its theoretical [-1, 1] range.
  const noiseValues = new Float32Array(sourceWidth * sourceHeight);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const value = noise.GetNoise(x * sourceScale, y * sourceScale);
      const offset = y * sourceWidth + x;
      noiseValues[offset] = value;
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }

  const source = new Uint8Array(noiseValues.length);
  const range = maximum - minimum;
  for (let i = 0; i < noiseValues.length; i += 1) {
    source[i] = range <= 0 ? 0 : Math.max(0, Math.min(255, Math.floor(((noiseValues[i]! - minimum) / range) * 255)));
  }

  const readSource = (x: number, y: number, mode: NoiseSourceMode = 'default'): number => {
    let wrappedX: number;
    let wrappedY: number;
    switch (mode) {
      case 'xy':
        wrappedX = (x + halfWidth) % size;
        wrappedY = (y + halfHeight) % size;
        break;
      case 'x':
        wrappedX = (x + halfWidth) % size;
        wrappedY = (y + halfHeight) % sourceHeight;
        break;
      case 'y':
        wrappedX = (x + halfWidth) % sourceWidth;
        wrappedY = (y + halfHeight) % size;
        break;
      default:
        wrappedX = (x + halfWidth) % sourceWidth;
        wrappedY = (y + halfHeight) % sourceHeight;
        break;
    }
    return source[wrappedY * sourceWidth + wrappedX]!;
  };

  const output = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      output[y * size + x] = readSource(x, y, 'xy');
    }
  }

  // Blend the vertical skirt over the middle seam, skipping the centre square.
  for (let x = halfWidth; x < skirtEdgeX; x += 1) {
    const alpha = Math.floor(255 * (1 - smoothstep(0.1, 0.9, (x - halfWidth) / skirtWidth)));
    for (let y = 0; y < size; y += 1) {
      if (y >= halfHeight && y < skirtEdgeY) continue;
      const index = y * size + x;
      output[index] = godotAlphaBlend(output[index]!, readSource(x, y, 'y'), alpha);
    }
  }

  // Blend the horizontal skirt over the middle seam, skipping the centre square.
  for (let y = halfHeight; y < skirtEdgeY; y += 1) {
    const alpha = Math.floor(255 * (1 - smoothstep(0.1, 0.9, (y - halfHeight) / skirtHeight)));
    for (let x = 0; x < size; x += 1) {
      if (x >= halfWidth && x < skirtEdgeX) continue;
      const index = y * size + x;
      output[index] = godotAlphaBlend(output[index]!, readSource(x, y, 'x'), alpha);
    }
  }

  // Blend the centre skirt from all four quadrants, exactly as Godot does.
  for (let y = halfHeight; y < skirtEdgeY; y += 1) {
    const yAlpha = Math.floor(255 * (1 - smoothstep(0.1, 0.9, (y - halfHeight) / skirtHeight)));
    for (let x = halfWidth; x < skirtEdgeX; x += 1) {
      const xAlpha = Math.floor(255 * (1 - smoothstep(0.1, 0.9, (x - halfWidth) / skirtWidth)));
      const topBlend = godotAlphaBlend(readSource(x, y, 'x'), readSource(x, y), xAlpha);
      const bottomBlend = godotAlphaBlend(readSource(x, y, 'xy'), readSource(x, y, 'y'), xAlpha);
      output[y * size + x] = godotAlphaBlend(bottomBlend, topBlend, yAlpha);
    }
  }

  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < output.length; i += 1) {
    const value = output[i]!;
    const offset = i * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }

  const texture = new DataTexture(rgba, size, size, RGBAFormat);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
// These match the seeds, frequencies and distinct sampler filters in the author's .tres resources.
// The original grass shader samples wind with nearest filtering; the cloud include uses linear.
export const FIELD_WIND_NOISE_TEXTURE = createFieldNoiseTexture(0, 0.01);
FIELD_WIND_NOISE_TEXTURE.magFilter = NearestFilter;
FIELD_WIND_NOISE_TEXTURE.minFilter = NearestFilter;
export const FIELD_CLOUD_NOISE_TEXTURE = FIELD_WIND_NOISE_TEXTURE.clone();
FIELD_CLOUD_NOISE_TEXTURE.magFilter = LinearFilter;
FIELD_CLOUD_NOISE_TEXTURE.minFilter = LinearFilter;
FIELD_CLOUD_NOISE_TEXTURE.needsUpdate = true;
export const FIELD_ALBEDO_NOISE_2_TEXTURE = createFieldNoiseTexture(0, 0.0046);
export const FIELD_ALBEDO_NOISE_3_TEXTURE = createFieldNoiseTexture(1, 0.0052);

/** Shared instances guarantee the surface and each grass blade use identical author colours. */
export const FIELD_GRASS_PALETTE = {
  albedo1: new Color(DEFAULT_FIELD_CONFIG.grass.albedoColor1),
  albedo2: new Color(DEFAULT_FIELD_CONFIG.grass.albedoColor2),
  albedo3: new Color(DEFAULT_FIELD_CONFIG.grass.albedoColor3),
  accentAlbedo1: new Color(DEFAULT_FIELD_CONFIG.grass.accentAlbedoColor1),
  accentAlbedo2: new Color(DEFAULT_FIELD_CONFIG.grass.accentAlbedoColor2),
};
export const FIELD_SURFACE_UNIFORMS = {
  uFieldSurfaceNoise2: { value: FIELD_ALBEDO_NOISE_2_TEXTURE },
  uFieldSurfaceNoise3: { value: FIELD_ALBEDO_NOISE_3_TEXTURE },
  uFieldSurfaceScale2: { value: 0.0011 },
  uFieldSurfaceThreshold2: { value: 0.537 },
  uFieldSurfaceScale3: { value: 0.001 },
  uFieldSurfaceThreshold3: { value: 0.471 },
  uFieldSurfaceAlbedo1: { value: FIELD_GRASS_PALETTE.albedo1 },
  uFieldSurfaceAlbedo2: { value: FIELD_GRASS_PALETTE.albedo2 },
  uFieldSurfaceAlbedo3: { value: FIELD_GRASS_PALETTE.albedo3 },
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
 * Normalize Twilite's stronger configurable lights to the author's Godot
 * shader baseline. This affects only grass/field materials, not the scene lights.
 */
export const FIELD_TOON_LIGHT_UNIFORMS = {
  uFieldToonDirectLightScale: { value: 1 / 2.2 },
  uFieldToonAmbientScale: { value: 0.18 / 1.4 },
};

export const FIELD_TOON_LIGHT_FRAGMENT_DECLARATIONS = [
  'uniform float uFieldToonDirectLightScale;',
  'uniform float uFieldToonAmbientScale;',
].join('\n');

export function syncFieldToonLighting(
  directionalIntensity: number,
  ambientIntensity: number,
): void {
  FIELD_TOON_LIGHT_UNIFORMS.uFieldToonDirectLightScale.value =
    Number.isFinite(directionalIntensity) && directionalIntensity > 0.001
      ? 1 / directionalIntensity
      : 0;
  FIELD_TOON_LIGHT_UNIFORMS.uFieldToonAmbientScale.value =
    Number.isFinite(ambientIntensity) && ambientIntensity > 0.001
      ? 0.18 / ambientIntensity
      : 0;
}

/**
 * Cloud-shadow settings from Demo.tscn. Twilite uses 100 world units per metre,
 * so the source 40 m cloud scale and 50 m cloud height become 4000 and 5000.
 */
export const FIELD_CLOUD_UNIFORMS = {
  uCloudNoise: { value: FIELD_CLOUD_NOISE_TEXTURE },
  uCloudTime: { value: 0 },
  uCloudScale: { value: DEFAULT_FIELD_CONFIG.grass.cloudNoiseScale },
  uCloudWorldHeight: { value: 5000 },
  uCloudSpeed: { value: DEFAULT_FIELD_CONFIG.grass.cloudSpeed },
  uCloudContrast: { value: DEFAULT_FIELD_CONFIG.grass.cloudContrast },
  uCloudThreshold: { value: DEFAULT_FIELD_CONFIG.grass.cloudThreshold },
  uCloudDirection: { value: new Vector2(0, -1) },
  uCloudLightDirection: { value: new Vector3(-160, 260, 420).normalize() },
  uCloudShadowMin: { value: 0.2 },
  // Godot's stepped toon response can lift cloud-capped light back up a level;
  // this small post-cap contrast keeps the same pattern readable at Twilite scale.
  uCloudShadowStrength: { value: DEFAULT_FIELD_CONFIG.grass.cloudShadowStrength },
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
  'uniform float uCloudShadowStrength;',
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
  '  float sample2 = texture2D(uCloudNoise, hitPosition.xy / max(uCloudScale, 0.001) * 0.8 + offset2 * (0.89 * 3.141592653589793 / 3.0)).r;',
  '  float visibility = clamp(sample1 * sample2 + uCloudThreshold, 0.0, 1.0);',
  '  visibility = (visibility - 0.5) * uCloudContrast + 0.5;',
  '  visibility = clamp(visibility + uCloudThreshold, uCloudShadowMin, 1.0);',
  '  return visibility;',
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
