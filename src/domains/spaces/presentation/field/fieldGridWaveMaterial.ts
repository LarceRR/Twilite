import {
  Color,
  DataTexture,
  DoubleSide,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  NormalBlending,
  RGBAFormat,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
} from 'three';

import { fieldWaveMaxRadiusSteps } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import {
  FIELD_WAVE_MAX_COUNT,
  FIELD_WAVE_SLOT_INACTIVE,
  pickFieldWaveSlot,
} from './fieldGridWave';

export const FIELD_GRID_MAX_PIXEL_LIGHTS = 12;
const vertexShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec2 vWorldXY;
varying float vWorldZ;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldXY = world.xy;
  vWorldZ = world.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

#define WAVE_COUNT 4
#define LIGHT_COUNT ${FIELD_GRID_MAX_PIXEL_LIGHTS}

uniform sampler2D uMap;
uniform vec2 uOrigins[WAVE_COUNT];
uniform float uStartTimes[WAVE_COUNT];
uniform float uTime;
uniform float uDuration;
uniform float uMaxRadiusSteps;
uniform float uPixelSize;
uniform float uMaxAlpha;
uniform float uFadeInEnd;
uniform float uFadeOutStart;
uniform vec3 uLightPositions[LIGHT_COUNT];
uniform vec3 uLightColors[LIGHT_COUNT];
uniform vec2 uLightParams[LIGHT_COUNT];
uniform vec2 uLightOccluders[LIGHT_COUNT];
uniform float uLightPixelSize;
uniform float uLightIntensityScale;
uniform float uLightAlphaScale;
uniform float uLightMaxAlpha;
uniform float uLightSurfaceColorMix;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;

varying vec2 vUv;
varying vec2 vWorldXY;
varying float vWorldZ;

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float smoother(float x) {
  return x * x * (3.0 - 2.0 * x);
}

float sampleWave(vec2 origin, float startTime) {
  if (startTime < 0.0) return 0.0;
  float elapsed = uTime - startTime;
  if (elapsed < 0.0 || elapsed >= uDuration) return 0.0;

  float t = saturate(elapsed / max(uDuration, 0.0001));
  float eased = t * t;
  float radius = floor(eased * uMaxRadiusSteps + 0.0001);
  if (radius <= 0.0) return 0.0;

  float fadeInEnd = uDuration * uFadeInEnd;
  float fadeOutStart = uDuration * uFadeOutStart;
  float fadeIn = fadeInEnd <= 0.0 ? 1.0 : saturate(elapsed / fadeInEnd);
  float fadeOut = elapsed <= fadeOutStart
    ? 1.0
    : 1.0 - saturate((elapsed - fadeOutStart) / (uDuration - fadeOutStart));
  float life = smoother(fadeIn) * smoother(fadeOut);

  vec2 cell = floor(vWorldXY / uPixelSize);
  vec2 originCell = floor(origin / uPixelSize);
  float dist = floor(distance(cell, originCell) + 0.0001);
  if (dist > radius) return 0.0;
  return (dist / radius) * uMaxAlpha * life;
}

vec4 samplePixelLight() {
  vec2 pixelWorld = floor(vWorldXY / uLightPixelSize) * uLightPixelSize + vec2(uLightPixelSize * 0.5);
  vec3 accumulated = vec3(0.0);

  for (int i = 0; i < LIGHT_COUNT; i++) {
    float intensity = uLightParams[i].x;
    float distanceLimit = uLightParams[i].y;
    if (intensity <= 0.0 || distanceLimit <= 0.0) continue;

    vec3 delta = vec3(
      pixelWorld - uLightPositions[i].xy,
      vWorldZ - uLightPositions[i].z
    );
    float distanceToSource = length(delta);
    float attenuation = saturate(1.0 - distanceToSource / distanceLimit);
    attenuation *= attenuation;

    // A platform blocks rays from a light above its top face to lower surfaces.
    // The crossing point creates a diagonal, physically motivated pixel-shadow edge.
    float platformTopZ = uLightOccluders[i].x;
    float platformHalfSize = uLightOccluders[i].y;
    float sourceZ = uLightPositions[i].z;
    float verticalSpan = sourceZ - vWorldZ;
    if (
      platformHalfSize > 0.0 &&
      vWorldZ < platformTopZ - 0.001 &&
      sourceZ > platformTopZ &&
      verticalSpan > 0.001
    ) {
      float fractionAtPlatformTop = (sourceZ - platformTopZ) / verticalSpan;
      vec2 crossing = mix(uLightPositions[i].xy, pixelWorld, fractionAtPlatformTop);
      vec2 crossingOffset = crossing - uLightPositions[i].xy;
      float edgeDistance = length(crossingOffset) - platformHalfSize;
      float softness = max(uLightPixelSize * 2.0, 10.0);
      // Fade the occlusion at the platform edge instead of cutting the light off abruptly.
      attenuation *= smoothstep(-softness, softness, edgeDistance);
    }

    accumulated += uLightColors[i] * intensity * attenuation * uLightIntensityScale;
  }

  float energy = max(max(accumulated.r, accumulated.g), accumulated.b);
  float alpha = clamp(energy * uLightAlphaScale, 0.0, uLightMaxAlpha);
  vec3 color = accumulated / max(energy, 0.0001);
  return vec4(color, alpha);
}

void main() {
  vec4 base = texture2D(uMap, vUv);
  vec3 color = base.rgb;
  float alpha = base.a;

  // The baked surface texture bypasses Three.js lighting, so give dark pixels a
  // low, warm ambient floor without washing out brighter grid lines or highlights.
  if (alpha > 0.001 && uAmbientIntensity > 0.0) {
    float baseBrightness = max(max(color.r, color.g), color.b);
    float ambientRoom = 1.0 - clamp(baseBrightness, 0.0, 1.0);
    color = min(vec3(1.0), color + uAmbientColor * (uAmbientIntensity * ambientRoom));
  }

  vec4 light = samplePixelLight();
  if (light.a > 0.001) {
    if (alpha > 0.001) {
      color = mix(color, light.rgb, light.a * uLightSurfaceColorMix);
      alpha = max(alpha, light.a);
    } else {
      color = light.rgb;
      alpha = light.a;
    }
  }

  float wave = 0.0;
  for (int i = 0; i < WAVE_COUNT; i++) {
    wave = max(wave, sampleWave(uOrigins[i], uStartTimes[i]));
  }
  if (wave > 0.0001) {
    if (alpha > 0.001) {
      color = mix(color, vec3(1.0), wave);
    } else {
      color = vec3(1.0);
      alpha = wave;
    }
    alpha = max(alpha, wave);
  }

  gl_FragColor = vec4(color, alpha);
}
`;

function createStartTimes(): number[] {
  return Array.from({ length: FIELD_WAVE_MAX_COUNT }, () => FIELD_WAVE_SLOT_INACTIVE);
}

function createOrigins(): Vector2[] {
  return Array.from({ length: FIELD_WAVE_MAX_COUNT }, () => new Vector2(0, 0));
}

function createLightPositions(): Vector3[] {
  return Array.from({ length: FIELD_GRID_MAX_PIXEL_LIGHTS }, () => new Vector3(0, 0, 0));
}

function createLightColors(): Color[] {
  return Array.from({ length: FIELD_GRID_MAX_PIXEL_LIGHTS }, () => new Color(0x000000));
}

function createLightParams(): Vector2[] {
  return Array.from({ length: FIELD_GRID_MAX_PIXEL_LIGHTS }, () => new Vector2(0, 0));
}

function createLightOccluders(): Vector2[] {
  return Array.from({ length: FIELD_GRID_MAX_PIXEL_LIGHTS }, () => new Vector2(0, 0));
}

const transparentPixelTexture = new DataTexture(
  new Uint8Array([0, 0, 0, 0]),
  1,
  1,
  RGBAFormat,
);
transparentPixelTexture.colorSpace = NoColorSpace;
transparentPixelTexture.magFilter = NearestFilter;
transparentPixelTexture.minFilter = LinearFilter;
transparentPixelTexture.generateMipmaps = false;
transparentPixelTexture.needsUpdate = true;

export type FieldGridPixelLight = {
  x: number;
  y: number;
  z: number;
  color: string;
  intensity: number;
  distance: number;
  platformTopZ: number;
  platformHalfSize: number;
};

export type FieldGridWaveMaterial = ShaderMaterial & {
  uniforms: {
    uMap: { value: Texture | null };
    uOrigins: { value: Vector2[] };
    uStartTimes: { value: number[] };
    uTime: { value: number };
    uDuration: { value: number };
    uMaxRadiusSteps: { value: number };
    uPixelSize: { value: number };
    uMaxAlpha: { value: number };
    uFadeInEnd: { value: number };
    uFadeOutStart: { value: number };
    uLightPositions: { value: Vector3[] };
    uLightColors: { value: Color[] };
    uLightParams: { value: Vector2[] };
    uLightOccluders: { value: Vector2[] };
    uLightPixelSize: { value: number };
    uLightIntensityScale: { value: number };
    uLightAlphaScale: { value: number };
    uLightMaxAlpha: { value: number };
    uLightSurfaceColorMix: { value: number };
    uAmbientColor: { value: Color };
    uAmbientIntensity: { value: number };
  };
};

const sceneWaveMaterials = new Set<FieldGridWaveMaterial>();
const sceneWaveOrigins = createOrigins();
const sceneWaveStartTimes = createStartTimes();
let sceneWaveTime = 0;

function copySceneWaveState(material: FieldGridWaveMaterial): void {
  material.uniforms.uTime.value = sceneWaveTime;
  for (let index = 0; index < FIELD_WAVE_MAX_COUNT; index += 1) {
    material.uniforms.uOrigins.value[index]!.copy(sceneWaveOrigins[index]!);
    material.uniforms.uStartTimes.value[index] = sceneWaveStartTimes[index]!;
  }
}

function setPixelLightsOnMaterial(
  material: FieldGridWaveMaterial,
  lights: readonly FieldGridPixelLight[],
): void {
  for (let index = 0; index < FIELD_GRID_MAX_PIXEL_LIGHTS; index += 1) {
    const light = lights[index];
    const position = material.uniforms.uLightPositions.value[index]!;
    const color = material.uniforms.uLightColors.value[index]!;
    const params = material.uniforms.uLightParams.value[index]!;
    const occluder = material.uniforms.uLightOccluders.value[index]!;

    if (
      light !== undefined &&
      Number.isFinite(light.x) &&
      Number.isFinite(light.y) &&
      Number.isFinite(light.z) &&
      Number.isFinite(light.intensity) &&
      light.intensity > 0 &&
      Number.isFinite(light.distance) &&
      light.distance > 0 &&
      Number.isFinite(light.platformTopZ) &&
      Number.isFinite(light.platformHalfSize) &&
      light.platformHalfSize > 0
    ) {
      position.set(light.x, light.y, light.z);
      color.set(light.color);
      params.set(light.intensity, light.distance);
      occluder.set(light.platformTopZ, light.platformHalfSize);
    } else {
      position.set(0, 0, 0);
      color.setRGB(0, 0, 0);
      params.set(0, 0);
      occluder.set(0, 0);
    }
  }
}

export function createFieldGridWaveMaterial(
  map: Texture | null = null,
): FieldGridWaveMaterial {
  const fieldConfig = getFieldConfig();
  const wave = fieldConfig.wave;
  const pixelGlow = fieldConfig.lighting.objectGlow.pixelOverlay;
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map ?? transparentPixelTexture },
      uOrigins: { value: createOrigins() },
      uStartTimes: { value: createStartTimes() },
      uTime: { value: sceneWaveTime },
      uDuration: { value: wave.durationSec },
      uMaxRadiusSteps: { value: fieldWaveMaxRadiusSteps(wave) },
      uPixelSize: { value: wave.pixelSizePx },
      uMaxAlpha: { value: wave.maxAlpha },
      uFadeInEnd: { value: wave.fadeInEnd },
      uFadeOutStart: { value: wave.fadeOutStart },
      uLightPositions: { value: createLightPositions() },
      uLightColors: { value: createLightColors() },
      uLightParams: { value: createLightParams() },
      uLightOccluders: { value: createLightOccluders() },
      uLightPixelSize: { value: pixelGlow.pixelSizePx },
      uLightIntensityScale: { value: pixelGlow.intensityScale },
      uLightAlphaScale: { value: pixelGlow.alphaScale },
      uLightMaxAlpha: { value: pixelGlow.maxAlpha },
      uLightSurfaceColorMix: { value: pixelGlow.surfaceColorMix },
      uAmbientColor: { value: new Color(fieldConfig.lighting.surfaceAmbientColor) },
      uAmbientIntensity: { value: fieldConfig.lighting.surfaceAmbientIntensity },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    toneMapped: false,
  }) as FieldGridWaveMaterial;
}

/** Register both the grid shader and platform overlays in one shared effects set. */
export function registerFieldGridWaveMaterial(
  material: FieldGridWaveMaterial,
): () => void {
  sceneWaveMaterials.add(material);
  copySceneWaveState(material);
  syncFieldGridWaveConfig(material);
  return () => sceneWaveMaterials.delete(material);
}

/** Apply the same currently-visible local lights to the shared pixel layer on every surface. */
export function syncFieldGridPixelLights(
  lights: readonly FieldGridPixelLight[],
): void {
  for (const material of sceneWaveMaterials) {
    setPixelLightsOnMaterial(material, lights);
  }
}

export function syncFieldGridWaveSceneConfig(): void {
  for (const material of sceneWaveMaterials) syncFieldGridWaveConfig(material);
}

export function syncFieldGridWaveSceneTime(elapsedTimeSec: number): void {
  sceneWaveTime = elapsedTimeSec;
  const duration = getFieldConfig().wave.durationSec;
  for (let index = 0; index < sceneWaveStartTimes.length; index += 1) {
    const start = sceneWaveStartTimes[index]!;
    if (start >= 0 && elapsedTimeSec - start >= duration) {
      sceneWaveStartTimes[index] = FIELD_WAVE_SLOT_INACTIVE;
    }
  }

  for (const material of sceneWaveMaterials) {
    material.uniforms.uTime.value = elapsedTimeSec;
    for (let index = 0; index < FIELD_WAVE_MAX_COUNT; index += 1) {
      material.uniforms.uOrigins.value[index]!.copy(sceneWaveOrigins[index]!);
      material.uniforms.uStartTimes.value[index] = sceneWaveStartTimes[index]!;
    }
  }
}

/** Trigger a wave once; every current and subsequently mounted surface shares it. */
export function triggerFieldGridWaveOnScene(
  originX: number,
  originY: number,
  elapsedTimeSec: number,
): void {
  const slot = pickFieldWaveSlot(
    sceneWaveStartTimes,
    elapsedTimeSec,
    getFieldConfig().wave.durationSec,
  );
  sceneWaveOrigins[slot]!.set(originX, originY);
  sceneWaveStartTimes[slot] = elapsedTimeSec;

  for (const material of sceneWaveMaterials) {
    material.uniforms.uOrigins.value[slot]!.set(originX, originY);
    material.uniforms.uStartTimes.value[slot] = elapsedTimeSec;
    material.uniforms.uTime.value = sceneWaveTime;
  }
}

/** Clear scene-scoped waves/lights when the 3D field unmounts. */
export function resetFieldGridWaveScene(): void {
  sceneWaveTime = 0;
  for (let index = 0; index < FIELD_WAVE_MAX_COUNT; index += 1) {
    sceneWaveOrigins[index]!.set(0, 0);
    sceneWaveStartTimes[index] = FIELD_WAVE_SLOT_INACTIVE;
  }
  for (const material of sceneWaveMaterials) {
    copySceneWaveState(material);
    setPixelLightsOnMaterial(material, []);
  }
}

/** Keep shader uniforms in sync with runtime field config overrides. */
export function syncFieldGridWaveConfig(material: FieldGridWaveMaterial): void {
  const wave = getFieldConfig().wave;
  material.uniforms.uDuration.value = wave.durationSec;
  material.uniforms.uMaxRadiusSteps.value = fieldWaveMaxRadiusSteps(wave);
  material.uniforms.uPixelSize.value = wave.pixelSizePx;
  material.uniforms.uMaxAlpha.value = wave.maxAlpha;
  material.uniforms.uFadeInEnd.value = wave.fadeInEnd;
  material.uniforms.uFadeOutStart.value = wave.fadeOutStart;

  const lighting = getFieldConfig().lighting;
  const pixelGlow = lighting.objectGlow.pixelOverlay;
  material.uniforms.uAmbientColor.value.set(lighting.surfaceAmbientColor);
  material.uniforms.uAmbientIntensity.value = lighting.surfaceAmbientIntensity;
  material.uniforms.uLightPixelSize.value = pixelGlow.pixelSizePx;
  material.uniforms.uLightIntensityScale.value = pixelGlow.intensityScale;
  material.uniforms.uLightAlphaScale.value = pixelGlow.alphaScale;
  material.uniforms.uLightMaxAlpha.value = pixelGlow.maxAlpha;
  material.uniforms.uLightSurfaceColorMix.value = pixelGlow.surfaceColorMix;
}

/** Per-material helpers remain available for isolated shader tests/tools. */
export function syncFieldGridWaveTime(
  material: FieldGridWaveMaterial,
  elapsedTimeSec: number,
): void {
  material.uniforms.uTime.value = elapsedTimeSec;
  const starts = material.uniforms.uStartTimes.value;
  const duration = material.uniforms.uDuration.value;
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]!;
    if (start >= 0 && elapsedTimeSec - start >= duration) {
      starts[index] = FIELD_WAVE_SLOT_INACTIVE;
    }
  }
}

export function triggerFieldGridWave(
  material: FieldGridWaveMaterial,
  originX: number,
  originY: number,
  elapsedTimeSec: number,
): void {
  const starts = material.uniforms.uStartTimes.value;
  const slot = pickFieldWaveSlot(starts, elapsedTimeSec, material.uniforms.uDuration.value);
  material.uniforms.uOrigins.value[slot]!.set(originX, originY);
  starts[slot] = elapsedTimeSec;
  material.uniforms.uTime.value = elapsedTimeSec;
}
