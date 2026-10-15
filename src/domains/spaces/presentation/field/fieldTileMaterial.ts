import { FrontSide, MeshStandardMaterial, type Texture } from 'three';

import {
  createFieldGridEffectUniforms,
  FIELD_GRID_MAX_PIXEL_LIGHTS,
  type FieldGridEffectMaterial,
} from './fieldGridWaveMaterial';
import { FIELD_WAVE_MAX_COUNT } from './fieldGridWave';

/** Matte, slightly rough clay-like finish for the physical tiles. */
const TILE_ROUGHNESS = 0.9;
const TILE_METALNESS = 0;
/**
 * The warm "emissive floor" is only a faint bounce-light tint. It must never
 * flatten the directional shading or fill shadows completely.
 */
const TILE_EMISSIVE_FLOOR_SCALE = 0.18;
/**
 * Occupied tiles are self-emissive. Their radiance is the per-instance glow
 * colour times the configured emissive intensity, times this gain.
 */
const TILE_EMISSIVE_GAIN = 4;
/** Candle falloff curvature: higher values concentrate the light near its source. */
const CANDLE_INVERSE_SQUARE_SCALE = 16;
const PROGRAM_CACHE_KEY = 'twilite-field-tile-v2';

export type FieldTileMaterial = MeshStandardMaterial & FieldGridEffectMaterial;

const vertexDeclarations = /* glsl */ `
attribute vec3 aGlow;
varying vec3 vFieldWorldPos;
varying vec3 vGlow;
`;

const vertexBody = /* glsl */ `
vec4 fieldWorldPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  fieldWorldPosition = instanceMatrix * fieldWorldPosition;
#endif
fieldWorldPosition = modelMatrix * fieldWorldPosition;
vFieldWorldPos = fieldWorldPosition.xyz;
vGlow = aGlow;
`;

const fragmentDeclarations = /* glsl */ `
#define FIELD_WAVE_COUNT ${FIELD_WAVE_MAX_COUNT}
#define FIELD_LIGHT_COUNT ${FIELD_GRID_MAX_PIXEL_LIGHTS}

uniform vec2 uOrigins[FIELD_WAVE_COUNT];
uniform float uStartTimes[FIELD_WAVE_COUNT];
uniform float uTime;
uniform float uDuration;
uniform float uMaxRadiusSteps;
uniform float uPixelSize;
uniform float uMaxAlpha;
uniform float uFadeInEnd;
uniform float uFadeOutStart;
uniform vec3 uLightPositions[FIELD_LIGHT_COUNT];
uniform vec3 uLightColors[FIELD_LIGHT_COUNT];
uniform vec2 uLightParams[FIELD_LIGHT_COUNT];
uniform float uLightPixelSize;
uniform float uLightIntensityScale;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform float uTileEmissiveIntensity;

varying vec3 vFieldWorldPos;
varying vec3 vGlow;

float fieldSmoother(float x) {
  return x * x * (3.0 - 2.0 * x);
}

float fieldSampleWave(vec2 p, vec2 origin, float startTime) {
  if (startTime < 0.0) return 0.0;
  float elapsed = uTime - startTime;
  if (elapsed < 0.0 || elapsed >= uDuration) return 0.0;

  float t = saturate(elapsed / max(uDuration, 0.0001));
  float radius = floor(t * t * uMaxRadiusSteps + 0.0001);
  if (radius <= 0.0) return 0.0;

  float fadeInEnd = uDuration * uFadeInEnd;
  float fadeOutStart = uDuration * uFadeOutStart;
  float fadeIn = fadeInEnd <= 0.0 ? 1.0 : saturate(elapsed / fadeInEnd);
  float fadeOut = elapsed <= fadeOutStart
    ? 1.0
    : 1.0 - saturate((elapsed - fadeOutStart) / max(uDuration - fadeOutStart, 0.0001));
  float life = fieldSmoother(fadeIn) * fieldSmoother(fadeOut);

  vec2 cell = floor(p / uPixelSize);
  vec2 originCell = floor(origin / uPixelSize);
  float dist = floor(distance(cell, originCell) + 0.0001);
  if (dist > radius) return 0.0;
  return (dist / radius) * uMaxAlpha * life;
}

// Local candle lights. Each surface pixel-cell is lit with a Lambert term and a
// windowed inverse-square falloff, so light reaches every neighbouring tile that
// is inside the configured radius, including the faces that are in shadow.
vec3 fieldCandleIrradiance(vec3 worldPos, vec3 worldNormal) {
  float cellSize = max(uLightPixelSize, 0.0001);
  vec3 snapped = floor(worldPos / cellSize) * cellSize + vec3(cellSize * 0.5);
  snapped -= worldNormal * dot(snapped - worldPos, worldNormal);

  vec3 total = vec3(0.0);
  for (int i = 0; i < FIELD_LIGHT_COUNT; i++) {
    float intensity = uLightParams[i].x;
    float range = uLightParams[i].y;
    if (intensity <= 0.0 || range <= 0.0) continue;

    vec3 toLight = uLightPositions[i] - snapped;
    float d = length(toLight);
    if (d >= range) continue;

    float ndl = saturate(dot(worldNormal, toLight / max(d, 0.0001)));
    if (ndl <= 0.0) continue;

    float ratio = d / range;
    float ratio2 = ratio * ratio;
    float window = saturate(1.0 - ratio2 * ratio2);
    window *= window;
    float inverseSquare = 1.0 / (1.0 + ${CANDLE_INVERSE_SQUARE_SCALE.toFixed(1)} * ratio2);
    total += uLightColors[i] * (intensity * window * inverseSquare * ndl);
  }
  return total * uLightIntensityScale;
}
`;

const fragmentBody = /* glsl */ `
{
  vec3 fieldNormal = normalize( inverseTransformDirection( normal, viewMatrix ) );
  vec3 fieldAlbedo = diffuseColor.rgb;

  outgoingLight += fieldAlbedo * fieldCandleIrradiance( vFieldWorldPos, fieldNormal );
  outgoingLight += fieldAlbedo * uAmbientColor *
    ( ( uAmbientIntensity + uTileEmissiveIntensity ) * ${TILE_EMISSIVE_FLOOR_SCALE.toFixed(3)} );

  // Occupied tiles glow by themselves: albedo-independent emission, driven by
  // the configured emissive intensity. Empty tiles carry a zero glow.
  outgoingLight += vGlow * uTileEmissiveIntensity * ${TILE_EMISSIVE_GAIN.toFixed(1)};

  // Interaction waves live on the tile tops, at their real elevation.
  if ( fieldNormal.z > 0.5 ) {
    float fieldWave = 0.0;
    for ( int i = 0; i < FIELD_WAVE_COUNT; i++ ) {
      fieldWave = max( fieldWave, fieldSampleWave( vFieldWorldPos.xy, uOrigins[i], uStartTimes[i] ) );
    }
    outgoingLight = mix( outgoingLight, vec3( 1.0 ), saturate( fieldWave ) );
  }
}
`;

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) {
    console.warn('Field tile shader anchor not found: ' + anchor);
    return source;
  }
  return source.replace(anchor, anchor + '\n' + addition);
}

function injectBefore(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) {
    console.warn('Field tile shader anchor not found: ' + anchor);
    return source;
  }
  return source.replace(anchor, addition + '\n' + anchor);
}

/**
 * Physically lit tile material: standard PBR shading for ambient + the shared
 * directional light (with real shadow maps), extended with the field's pixel
 * candle lights, per-instance self-emission for occupied tiles and tap waves.
 */
export function createFieldTileMaterial(map: Texture): FieldTileMaterial {
  const material = new MeshStandardMaterial({
    map,
    roughness: TILE_ROUGHNESS,
    metalness: TILE_METALNESS,
    side: FrontSide,
    transparent: false,
    depthWrite: true,
    depthTest: true,
  }) as FieldTileMaterial;

  material.uniforms = createFieldGridEffectUniforms(map);
  material.receivesPixelLights = true;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.uniforms);
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', vertexDeclarations);
    shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', vertexBody);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', fragmentDeclarations);
    shader.fragmentShader = injectBefore(
      shader.fragmentShader,
      '#include <opaque_fragment>',
      fragmentBody,
    );
  };
  material.customProgramCacheKey = () => PROGRAM_CACHE_KEY;
  return material;
}

/** Swap the albedo texture without recompiling the shader program. */
export function setFieldTileMaterialMap(material: FieldTileMaterial, map: Texture): void {
  if (material.map === map) return;
  material.map = map;
  material.uniforms.uMap.value = map;
}
