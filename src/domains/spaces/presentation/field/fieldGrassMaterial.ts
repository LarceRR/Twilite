import {
  Color,
  DataTexture,
  DoubleSide,
  LinearFilter,
  MeshStandardMaterial,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  Vector2,
} from 'three';

import {
  createFieldNoiseTexture,
  FIELD_CLOUD_FRAGMENT_DECLARATIONS,
  FIELD_CLOUD_UNIFORMS,
} from './fieldCloudShadows';

/**
 * Temporary pixel-art blade textures. Replace these three generated sprites
 * with the final grass PNGs when the artwork is ready.
 */
function createGrassSpriteTexture(variant: 0 | 1 | 2): DataTexture {
  const width = 16;
  const height = 24;
  const data = new Uint8Array(width * height * 4);

  const setPixel = (x: number, y: number, color: readonly [number, number, number]): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = (y * width + x) * 4;
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255;
  };

  const dark: readonly [number, number, number] = [38, 76, 13];
  const mid: readonly [number, number, number] = variant === 2
    ? [80, 135, 21]
    : variant === 1
      ? [126, 157, 26]
      : [105, 145, 18];
  const light: readonly [number, number, number] = variant === 2
    ? [151, 177, 42]
    : variant === 1
      ? [181, 203, 59]
      : [153, 184, 31];

  for (let y = 0; y < height; y += 1) {
    const progress = y / (height - 1);
    const center = Math.round(8 + (variant === 1 ? -1 : 1) * progress * 2);
    const halfWidth = y < 3 ? 1 : y < 8 ? 2 : y < 15 ? 3 : y < 20 ? 2 : 1;

    for (let x = center - halfWidth; x <= center + halfWidth; x += 1) {
      const edge = x === center - halfWidth || x === center + halfWidth;
      const highlight = x <= center && y > 3;
      setPixel(x, y, edge ? dark : highlight ? light : mid);
    }
  }

  // Two shorter side blades make the temporary sprite read as a small grass tuft.
  for (let y = 0; y < 13; y += 1) {
    const leftX = Math.round(5 - y * 0.22);
    const rightX = Math.round(10 + y * 0.18);
    const bladeColor = y % 4 === 0 ? light : mid;
    setPixel(leftX, y, dark);
    setPixel(leftX + 1, y, bladeColor);
    if (y < 10) {
      setPixel(rightX, y, bladeColor);
      setPixel(rightX + 1, y, dark);
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const grassSprite = createGrassSpriteTexture(0);
const grassAccentSprite1 = createGrassSpriteTexture(1);
const grassAccentSprite2 = createGrassSpriteTexture(2);
const grassWindNoise = createFieldNoiseTexture(413);
const grassAlbedoNoise2 = createFieldNoiseTexture(417);
const grassAlbedoNoise3 = createFieldNoiseTexture(421);

/**
 * Author parameters converted to Twilite's world scale (100 field units = 1 m).
 * Wind / albedo texture coordinates are divided by 100; angles and time are unchanged.
 */
const FIELD_GRASS_UNIFORMS = {
  uGrassTime: { value: 0 },
  uGrassWindNoise: { value: grassWindNoise },
  uGrassAlbedoNoise2: { value: grassAlbedoNoise2 },
  uGrassAlbedoNoise3: { value: grassAlbedoNoise3 },
  uGrassAccentTexture1: { value: grassAccentSprite1 },
  uGrassAccentTexture2: { value: grassAccentSprite2 },
  uGrassWindDirection: { value: new Vector2(0, 1) },
  uGrassWindScale: { value: 0.00071 },
  uGrassWindSpeed: { value: 0.025 },
  uGrassWindThreshold: { value: 0.365 },
  uGrassWindDivergence: { value: 10 },
  uGrassWindAngle: { value: 60 },
  uGrassFramerate: { value: 5 },
  uGrassQuantized: { value: 1 },
  uGrassViewSwaySpeed: { value: 0.1 },
  uGrassViewSwayAngle: { value: 10 },
  uGrassFakePerspectiveScale: { value: 0.3 },
  uGrassWindScreenDirection: { value: 1 },
  uGrassWindAlignment: { value: 0 },
  uGrassAlbedoScale2: { value: 0.0011 },
  uGrassAlbedoThreshold2: { value: 0.537 },
  uGrassAlbedoScale3: { value: 0.001 },
  uGrassAlbedoThreshold3: { value: 0.471 },
  uGrassAlbedo1: { value: new Color(0x719f00) },
  uGrassAlbedo2: { value: new Color(0x8eae36) },
  uGrassAlbedo3: { value: new Color(0x80a739) },
  uGrassAccentAlbedo1: { value: new Color(0x9ab700) },
  uGrassAccentAlbedo2: { value: new Color(0x6c9a00) },
};

const grassVertexDeclarations = [
  'attribute float aGrassSeed;',
  'attribute vec2 aGrassDimensions;',
  'attribute float aGrassAccent;',
  'varying vec3 vGrassWorldOrigin;',
  'varying float vGrassWindSample;',
  'varying float vGrassFakePerspective;',
  'varying float vGrassSeed;',
  'varying float vGrassAccent;',
  'varying vec2 vGrassUv;',
  'uniform float uGrassTime;',
  'uniform sampler2D uGrassWindNoise;',
  'uniform vec2 uGrassWindDirection;',
  'uniform float uGrassWindScale;',
  'uniform float uGrassWindSpeed;',
  'uniform float uGrassWindThreshold;',
  'uniform float uGrassWindDivergence;',
  'uniform float uGrassWindAngle;',
  'uniform float uGrassFramerate;',
  'uniform float uGrassQuantized;',
  'uniform float uGrassViewSwaySpeed;',
  'uniform float uGrassViewSwayAngle;',
  'uniform float uGrassFakePerspectiveScale;',
  'uniform float uGrassWindScreenDirection;',
  'uniform float uGrassWindAlignment;',
  'vec2 fieldGrassRotate(vec2 vector, float degrees) {',
  '  float angle = degrees * (3.141592653589793 / 180.0);',
  '  float c = cos(angle);',
  '  float s = sin(angle);',
  '  return vec2(vector.x * c - vector.y * s, vector.x * s + vector.y * c);',
  '}',
].join('\n');

const grassVertexBody = [
  '#include <begin_vertex>',
  'vec3 grassWorldOrigin = (modelMatrix * vec4(position, 1.0)).xyz;',
  '#ifdef USE_INSTANCING',
  '  grassWorldOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
  '#endif',
  'float grassSeed = aGrassSeed;',
  'float grassFrameRate = max(uGrassFramerate, 1.0);',
  'float grassFrameTime = 1.0 / grassFrameRate;',
  'float grassPhase = mod(grassSeed * 10.0, grassFrameTime);',
  'float grassQuantizedTime = floor((uGrassTime + grassPhase) * grassFrameRate + 0.5) / grassFrameRate;',
  'float grassTime = uGrassQuantized > 0.5 ? grassQuantizedTime : uGrassTime;',
  'vec2 grassDirection1 = fieldGrassRotate(uGrassWindDirection, uGrassWindDivergence);',
  'vec2 grassDirection2 = fieldGrassRotate(uGrassWindDirection, -uGrassWindDivergence);',
  'vec2 grassOffset1 = grassTime * uGrassWindSpeed * normalize(grassDirection1);',
  'vec2 grassOffset2 = grassTime * uGrassWindSpeed * normalize(grassDirection2);',
  'float grassNoise1 = texture2D(uGrassWindNoise, grassWorldOrigin.xy * uGrassWindScale + grassOffset1).r;',
  'float grassNoise2 = texture2D(uGrassWindNoise, grassWorldOrigin.xy * (uGrassWindScale * 0.8) + grassOffset2 * (0.89 * 3.141592653589793 / 3.0)).r;',
  'float grassWind = clamp(grassNoise1 * grassNoise2 + uGrassWindThreshold, 0.0, 1.0);',
  'grassWind = (grassWind - 0.5) * 2.0;',
  'float grassWorldSway = grassWind * radians(uGrassWindAngle) * uGrassWindScreenDirection;',
  'float grassViewSway = sin((grassTime + grassSeed * 10.0) * uGrassViewSwaySpeed * 6.283185307179586) * radians(uGrassViewSwayAngle);',
  'float grassSway = grassWorldSway + grassViewSway;',
  'transformed.x += uv.y * (aGrassDimensions.y / max(aGrassDimensions.x, 0.001)) * sin(grassSway);',
  'vGrassWorldOrigin = grassWorldOrigin;',
  'vGrassWindSample = grassWind;',
  'vGrassFakePerspective = grassWind * uGrassFakePerspectiveScale * uGrassWindAlignment;',
  'vGrassSeed = aGrassSeed;',
  'vGrassAccent = aGrassAccent;',
  'vGrassUv = uv;',
].join('\n');

const grassFragmentDeclarations = [
  'varying vec3 vGrassWorldOrigin;',
  'varying float vGrassWindSample;',
  'varying float vGrassFakePerspective;',
  'varying float vGrassSeed;',
  'varying float vGrassAccent;',
  'varying vec2 vGrassUv;',
  'uniform sampler2D uGrassAlbedoNoise2;',
  'uniform sampler2D uGrassAlbedoNoise3;',
  'uniform sampler2D uGrassAccentTexture1;',
  'uniform sampler2D uGrassAccentTexture2;',
  'uniform float uGrassAlbedoScale2;',
  'uniform float uGrassAlbedoThreshold2;',
  'uniform float uGrassAlbedoScale3;',
  'uniform float uGrassAlbedoThreshold3;',
  'uniform vec3 uGrassAlbedo1;',
  'uniform vec3 uGrassAlbedo2;',
  'uniform vec3 uGrassAlbedo3;',
  'uniform vec3 uGrassAccentAlbedo1;',
  'uniform vec3 uGrassAccentAlbedo2;',
  'uniform float uGrassFakePerspectiveScale;',
].join('\n');

const grassUvBody = [
  '#ifdef USE_MAP',
  '  float grassPerspective = vGrassFakePerspective * uGrassFakePerspectiveScale;',
  '  vMapUv.x = clamp(0.5 + (vMapUv.x - 0.5) * (1.0 + (1.0 - vMapUv.y) * grassPerspective), 0.0, 1.0);',
  '#endif',
].join('\n');

const grassColorBody = [
  'float grassPatch2 = texture2D(uGrassAlbedoNoise2, vGrassWorldOrigin.xy * uGrassAlbedoScale2).r;',
  'float grassPatch3 = texture2D(uGrassAlbedoNoise3, vGrassWorldOrigin.xy * uGrassAlbedoScale3).r;',
  'vec3 grassTint = uGrassAlbedo1;',
  'if (grassPatch2 > uGrassAlbedoThreshold2) grassTint = uGrassAlbedo2;',
  'if (grassPatch3 > uGrassAlbedoThreshold3) grassTint = uGrassAlbedo3;',
  'diffuseColor.rgb *= grassTint;',
  'if (vGrassAccent > 1.5) {',
  '  vec4 accentSample = texture2D(uGrassAccentTexture2, vMapUv);',
  '  diffuseColor.rgb = accentSample.rgb * uGrassAccentAlbedo2;',
  '  diffuseColor.a = accentSample.a;',
  '} else if (vGrassAccent > 0.5) {',
  '  vec4 accentSample = texture2D(uGrassAccentTexture1, vMapUv);',
  '  diffuseColor.rgb = accentSample.rgb * uGrassAccentAlbedo1;',
  '  diffuseColor.a = accentSample.a;',
  '}',
].join('\n');

const grassLightingBody = [
  'float fieldGrassCloud = fieldCloudVisibility(vGrassWorldOrigin);',
  'float fieldGrassLuminance = max(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)), 0.0);',
  'float fieldGrassDiffuse = clamp(fieldGrassLuminance * fieldGrassCloud, 0.0, 1.0);',
  'float fieldGrassCut = 1.0 / 3.0;',
  'float fieldGrassNearestCut = floor(fieldGrassDiffuse / fieldGrassCut + 0.5);',
  'float fieldGrassThreshold = fieldGrassNearestCut * fieldGrassCut;',
  'float fieldGrassHalfWidth = 0.5 * fieldGrassCut * 0.255;',
  'float fieldGrassLow = max(0.0, fieldGrassThreshold - fieldGrassHalfWidth);',
  'float fieldGrassHigh = min(1.0, fieldGrassThreshold + fieldGrassHalfWidth);',
  'float fieldGrassBlend = fieldGrassHigh > fieldGrassLow ? smoothstep(fieldGrassLow, fieldGrassHigh, fieldGrassDiffuse) : step(fieldGrassThreshold, fieldGrassDiffuse);',
  'float fieldGrassStepped = clamp(mix(fieldGrassThreshold, min(fieldGrassThreshold + fieldGrassCut, 1.0), fieldGrassBlend), 0.0, 1.0);',
  'outgoingLight *= fieldGrassStepped / max(fieldGrassLuminance, 0.0001);',
].join('\n');

export const FIELD_GRASS_MATERIAL = createFieldGrassMaterial();

function createFieldGrassMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    map: grassSprite,
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    side: DoubleSide,
    transparent: false,
    alphaTest: 0.45,
    depthWrite: true,
    depthTest: true,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, FIELD_GRASS_UNIFORMS, FIELD_CLOUD_UNIFORMS);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\n' + grassVertexDeclarations,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      grassVertexBody,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\n' + grassFragmentDeclarations + '\n' + FIELD_CLOUD_FRAGMENT_DECLARATIONS,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      grassUvBody + '\n#include <map_fragment>',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n' + grassColorBody,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      grassLightingBody + '\n#include <opaque_fragment>',
    );
  };

  material.customProgramCacheKey = () => 'twilite-field-grass-v1';
  return material;
}
