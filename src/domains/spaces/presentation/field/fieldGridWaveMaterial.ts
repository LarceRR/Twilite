import {
  DoubleSide,
  ShaderMaterial,
  type Texture,
  Vector2,
} from 'three';

import { fieldWaveMaxRadiusSteps } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import {
  FIELD_WAVE_MAX_COUNT,
  FIELD_WAVE_SLOT_INACTIVE,
  pickFieldWaveSlot,
} from './fieldGridWave';

const vertexShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec2 vWorldXY;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldXY = world.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

#define WAVE_COUNT 4

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

varying vec2 vUv;
varying vec2 vWorldXY;

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

  // Keep growing until the wave fully ends (max size only as it is already faint).
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

  // Center 0% → rim maxAlpha.
  return (dist / radius) * uMaxAlpha * life;
}

void main() {
  vec4 base = texture2D(uMap, vUv);
  float wave = 0.0;
  for (int i = 0; i < WAVE_COUNT; i++) {
    wave = max(wave, sampleWave(uOrigins[i], uStartTimes[i]));
  }
  vec3 color = mix(base.rgb, vec3(1.0), wave);
  gl_FragColor = vec4(color, 1.0);
}
`;

function createStartTimes(): number[] {
  return Array.from({ length: FIELD_WAVE_MAX_COUNT }, () => FIELD_WAVE_SLOT_INACTIVE);
}

function createOrigins(): Vector2[] {
  return Array.from({ length: FIELD_WAVE_MAX_COUNT }, () => new Vector2(0, 0));
}

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
  };
};

export function createFieldGridWaveMaterial(
  map: Texture | null = null,
): FieldGridWaveMaterial {
  const wave = getFieldConfig().wave;
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOrigins: { value: createOrigins() },
      uStartTimes: { value: createStartTimes() },
      uTime: { value: 0 },
      uDuration: { value: wave.durationSec },
      uMaxRadiusSteps: { value: fieldWaveMaxRadiusSteps(wave) },
      uPixelSize: { value: wave.pixelSizePx },
      uMaxAlpha: { value: wave.maxAlpha },
      uFadeInEnd: { value: wave.fadeInEnd },
      uFadeOutStart: { value: wave.fadeOutStart },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    toneMapped: false,
  }) as FieldGridWaveMaterial;
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
}

export function syncFieldGridWaveTime(
  material: FieldGridWaveMaterial,
  elapsedTimeSec: number,
): void {
  material.uniforms.uTime.value = elapsedTimeSec;
  const starts = material.uniforms.uStartTimes.value;
  const duration = material.uniforms.uDuration.value;
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i]!;
    if (start >= 0 && elapsedTimeSec - start >= duration) {
      starts[i] = FIELD_WAVE_SLOT_INACTIVE;
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
