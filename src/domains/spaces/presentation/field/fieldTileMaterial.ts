import { FrontSide, MeshStandardMaterial, type Texture } from 'three';

import {
  createFieldGridEffectUniforms,
  FIELD_GRID_MAX_PIXEL_LIGHTS,
  type FieldGridEffectMaterial,
} from './fieldGridWaveMaterial';
import { FIELD_WAVE_MAX_COUNT } from './fieldGridWave';
import { getFieldOccupiedTileMaps } from './fieldOccupiedTileMaps';

/** Default finish for ordinary, non-occupied tiles. */
const TILE_ROUGHNESS = 0.9;
const TILE_METALNESS = 0;
/** Physical material values for cells holding an object. */
const OCCUPIED_TILE_METALNESS = 0.24;
/**
 * Preserve most physical lighting on glowing tiles. The old 0.9 suppression
 * made their emissive colour read as one flat, featureless rectangle.
 */
const OCCUPIED_TILE_LIGHT_SUPPRESSION = 0.08;
/** Emission remains visible but no longer overwhelms all surface shading. */
const TILE_EMISSIVE_GAIN = 0.12;
const TILE_EMISSIVE_MAX = 0.22;
/** The warm "emissive floor" is only a faint bounce-light tint. */
const TILE_EMISSIVE_FLOOR_SCALE = 0.18;
/** Candle falloff curvature: higher values concentrate the light near its source. */
const CANDLE_INVERSE_SQUARE_SCALE = 16;
/** Add candle light on top of dark albedo so nearby surfaces remain readable. */
const CANDLE_ALBEDO_FLOOR = 0.35;
const PROGRAM_CACHE_KEY = 'twilite-field-tile-v7';

export type FieldTileMaterial = MeshStandardMaterial & FieldGridEffectMaterial;

const vertexDeclarations = /* glsl */ `
attribute vec3 aGlow;
varying vec3 vFieldWorldPos;
varying vec3 vGlow;
varying vec2 vTileUv;
`;

const vertexBody = /* glsl */ `
vec4 fieldWorldPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  fieldWorldPosition = instanceMatrix * fieldWorldPosition;
#endif
fieldWorldPosition = modelMatrix * fieldWorldPosition;
vFieldWorldPos = fieldWorldPosition.xyz;
vGlow = aGlow;
vTileUv = uv;
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
uniform sampler2D uOccupiedTileAlbedoMap;
uniform sampler2D uOccupiedTileRoughnessMap;
uniform float uUseGeneratedTileAlbedo;

varying vec3 vFieldWorldPos;
varying vec3 vGlow;
varying vec2 vTileUv;

float fieldSmoother(float x) {
  return x * x * (3.0 - 2.0 * x);
}

vec3 fieldSrgbToLinear(vec3 color) {
  return vec3(
    color.r <= 0.04045 ? color.r / 12.92 : pow((color.r + 0.055) / 1.055, 2.4),
    color.g <= 0.04045 ? color.g / 12.92 : pow((color.g + 0.055) / 1.055, 2.4),
    color.b <= 0.04045 ? color.b / 12.92 : pow((color.b + 0.055) / 1.055, 2.4)
  );
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

// Local candle lights illuminate all nearby faces, with a soft radius falloff.
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

const occupiedTileColorBody = /* glsl */ `
float fieldGlowMax = max( vGlow.r, max( vGlow.g, vGlow.b ) );
float fieldGlowMask = smoothstep( 0.001, 0.08, fieldGlowMax );

// The generated atlas is the default copper finish. A user-selected tile
// texture remains authoritative, while both modes still use the worn roughness map.
vec3 fieldOccupiedAlbedo = fieldSrgbToLinear(
  texture2D( uOccupiedTileAlbedoMap, vTileUv ).rgb
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  fieldOccupiedAlbedo,
  fieldGlowMask * uUseGeneratedTileAlbedo
);
`;

const occupiedTileSurfaceBody = /* glsl */ `
// Apply material variation after Three.js has declared roughnessFactor and
// metalnessFactor. The first narrow UV band is the chamfer; side walls stay rough.
float fieldOccupiedRoughness = texture2D( uOccupiedTileRoughnessMap, vTileUv ).r;
roughnessFactor = mix(
  roughnessFactor,
  clamp( fieldOccupiedRoughness, 0.24, 0.9 ),
  fieldGlowMask
);
metalnessFactor = mix(
  metalnessFactor,
  ${OCCUPIED_TILE_METALNESS.toFixed(2)},
  fieldGlowMask
);
`;

const fragmentBody = /* glsl */ `
{
  vec3 fieldNormal = normalize( inverseTransformDirection( normal, viewMatrix ) );
  vec3 fieldAlbedo = diffuseColor.rgb;

  // Occupied tiles retain a restrained warm emission so direct lighting,
  // material variation and bevel shading remain visible.
  float glowMax = max( vGlow.r, max( vGlow.g, vGlow.b ) );
  float glowMask = saturate( glowMax * 8.0 );

  vec3 lit = ( fieldAlbedo + vec3( ${CANDLE_ALBEDO_FLOOR.toFixed(2)} ) ) *
    fieldCandleIrradiance( vFieldWorldPos, fieldNormal );
  lit += fieldAlbedo * uAmbientColor *
    ( ( uAmbientIntensity + uTileEmissiveIntensity ) * ${TILE_EMISSIVE_FLOOR_SCALE.toFixed(3)} );
  outgoingLight = mix(
    outgoingLight + lit,
    vec3( 0.0 ),
    glowMask * ${OCCUPIED_TILE_LIGHT_SUPPRESSION.toFixed(2)}
  );

  // Cap emission without independently clipping colour channels, preserving
  // the warm hue while letting the base material and bevels show through.
  vec3 emitted = vGlow * uTileEmissiveIntensity * ${TILE_EMISSIVE_GAIN.toFixed(2)};
  float emittedMax = max( emitted.r, max( emitted.g, emitted.b ) );
  if ( emittedMax > ${TILE_EMISSIVE_MAX.toFixed(2)} ) {
    emitted *= ${TILE_EMISSIVE_MAX.toFixed(2)} / emittedMax;
  }
  outgoingLight += emitted;

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
 * Physically lit tiles use standard PBR shading, with a warm glazed finish and
 * procedural grain applied only to occupied instances. Empty tiles stay matte.
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
  material.userData.occupiedTileUniforms = {
    uUseGeneratedTileAlbedo: { value: 1 },
  };
  material.receivesPixelLights = true;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.uniforms);
    const occupiedTileMaps = getFieldOccupiedTileMaps();
    const occupiedTileUniforms = material.userData.occupiedTileUniforms as {
      readonly uUseGeneratedTileAlbedo: { value: number };
    };
    shader.uniforms.uOccupiedTileAlbedoMap = { value: occupiedTileMaps.albedo };
    shader.uniforms.uOccupiedTileRoughnessMap = { value: occupiedTileMaps.roughness };
    shader.uniforms.uUseGeneratedTileAlbedo = occupiedTileUniforms.uUseGeneratedTileAlbedo;
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', vertexDeclarations);
    shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', vertexBody);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', fragmentDeclarations);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>', occupiedTileColorBody);
    // Place this after metalnessmap_fragment, where both PBR factors exist.
    shader.fragmentShader = inject(shader.fragmentShader, '#include <metalnessmap_fragment>', occupiedTileSurfaceBody);
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
export function setFieldTileMaterialMap(
  material: FieldTileMaterial,
  map: Texture,
  useGeneratedAlbedo = true,
): void {
  const occupiedTileUniforms = material.userData.occupiedTileUniforms as {
    readonly uUseGeneratedTileAlbedo: { value: number };
  } | undefined;
  if (occupiedTileUniforms !== undefined) {
    occupiedTileUniforms.uUseGeneratedTileAlbedo.value = useGeneratedAlbedo ? 1 : 0;
  }
  if (material.map === map) return;
  material.map = map;
  material.uniforms.uMap.value = map;
}
