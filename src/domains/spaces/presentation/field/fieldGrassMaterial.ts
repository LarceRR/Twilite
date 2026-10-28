import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import grassBladeAsset from './assets/grass-blade.png';
import grassAccentAsset1 from './assets/author-grassleaf.png';
import grassAccentAsset2 from './assets/author-accentleaf.png';
import {
  DataTexture,
  DoubleSide,
  MeshStandardMaterial,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  ClampToEdgeWrapping,
  Vector2,
  Vector3,
  type Camera,
} from 'three';

import {
  FIELD_ALBEDO_NOISE_2_TEXTURE,
  FIELD_ALBEDO_NOISE_3_TEXTURE,
  FIELD_CLOUD_FRAGMENT_DECLARATIONS,
  FIELD_CLOUD_UNIFORMS,
  FIELD_GRASS_PALETTE,
  FIELD_TOON_LIGHT_FRAGMENT_DECLARATIONS,
  FIELD_TOON_LIGHT_UNIFORMS,
  FIELD_WIND_NOISE_TEXTURE,
} from './fieldCloudShadows';
import { DEFAULT_FIELD_CONFIG, type FieldConfig } from './fieldConfig';

/**
 * The main sprite is the replaceable Twilite 24×24 PNG. Generated textures are
 * only a fallback if Expo cannot load the bundled images; accent sprites are Dylearn's originals.
 */
function createGrassSpriteTexture(variant: 0 | 1 | 2): DataTexture {
  const width = 24;
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

  const dark: readonly [number, number, number] = [172, 172, 172];
  const mid: readonly [number, number, number] = variant === 2
    ? [238, 238, 238]
    : variant === 1
      ? [224, 224, 224]
      : [255, 255, 255];
  const light: readonly [number, number, number] = [255, 255, 255];

  for (let y = 0; y < height; y += 1) {
    const progress = y / (height - 1);
    const center = Math.round(12 + (variant === 1 ? -1 : 1) * progress * 2);
    const halfWidth = y < 3 ? 1 : y < 8 ? 2 : y < 15 ? 3 : y < 20 ? 2 : 1;

    for (let x = center - halfWidth; x <= center + halfWidth; x += 1) {
      const edge = x === center - halfWidth || x === center + halfWidth;
      const highlight = x <= center && y > 3;
      setPixel(x, y, edge ? dark : highlight ? light : mid);
    }
  }

  // Two shorter side blades make the temporary sprite read as a small grass tuft.
  for (let y = 0; y < 13; y += 1) {
    const leftX = Math.round(8 - y * 0.22);
    const rightX = Math.round(15 + y * 0.18);
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

let grassSprite: Texture = createGrassSpriteTexture(0);
let grassAccentSprite1: Texture = createGrassSpriteTexture(1);
let grassAccentSprite2: Texture = createGrassSpriteTexture(2);
const grassWindNoise = FIELD_WIND_NOISE_TEXTURE;
const grassAlbedoNoise2 = FIELD_ALBEDO_NOISE_2_TEXTURE;
const grassAlbedoNoise3 = FIELD_ALBEDO_NOISE_3_TEXTURE;

/**
 * Author parameters converted to Twilite's world scale (100 field units = 1 m).
 * Wind / albedo texture coordinates are divided by 100; angles and time are unchanged.
 */
const defaultGrassConfig = DEFAULT_FIELD_CONFIG.grass;

const FIELD_GRASS_UNIFORMS = {
  uGrassTime: { value: 0 },
  uGrassWindEnabled: { value: defaultGrassConfig.windEnabled ? 1 : 0 },
  uGrassAlbedoNoiseEnabled: { value: defaultGrassConfig.albedoNoiseEnabled ? 1 : 0 },
  uGrassCloudShadowsEnabled: { value: defaultGrassConfig.cloudShadowsEnabled ? 1 : 0 },
  uGrassAccentOffset1: { value: defaultGrassConfig.accentOffset1 },
  uGrassAccentOffset2: { value: defaultGrassConfig.accentOffset2 },
  uGrassWindNoise: { value: grassWindNoise },
  uGrassAlbedoNoise2: { value: grassAlbedoNoise2 },
  uGrassAlbedoNoise3: { value: grassAlbedoNoise3 },
  uGrassAccentTexture1: { value: grassAccentSprite1 },
  uGrassAccentTexture2: { value: grassAccentSprite2 },
  uGrassWindDirection: { value: new Vector2(defaultGrassConfig.windDirectionX, defaultGrassConfig.windDirectionY) },
  uGrassWindScale: { value: defaultGrassConfig.windScale },
  uGrassWindSpeed: { value: defaultGrassConfig.windSpeed },
  uGrassWindThreshold: { value: defaultGrassConfig.windThreshold },
  uGrassWindDivergence: { value: defaultGrassConfig.windDivergence },
  uGrassWindSecondaryScaleRatio: { value: defaultGrassConfig.windSecondaryScaleRatio },
  uGrassWindSecondaryOffsetRatio: { value: defaultGrassConfig.windSecondaryOffsetRatio },
  uGrassSeedPhaseScale: { value: defaultGrassConfig.seedPhaseScale },
  uGrassCloudShadowCurveExponent: { value: defaultGrassConfig.cloudShadowCurveExponent },
  uGrassWindAngle: { value: defaultGrassConfig.windAngle },
  uGrassFramerate: { value: defaultGrassConfig.windFramerate },
  uGrassQuantized: { value: defaultGrassConfig.quantizedAnimation ? 1 : 0 },
  uGrassViewSwaySpeed: { value: defaultGrassConfig.viewSwaySpeed },
  uGrassViewSwayAngle: { value: defaultGrassConfig.viewSwayAngle },
  uGrassFakePerspectiveScale: { value: defaultGrassConfig.fakePerspectiveScale },
  uGrassCameraRightWorld: { value: new Vector3(0, -1, 0) },
  uGrassCameraNormalWorld: { value: new Vector3(-1, 0, 0) },
  uGrassWindAlignment: { value: 0 },
  uGrassAlbedoScale2: { value: defaultGrassConfig.albedoScale2 },
  uGrassAlbedoThreshold2: { value: defaultGrassConfig.albedoThreshold2 },
  uGrassAlbedoScale3: { value: defaultGrassConfig.albedoScale3 },
  uGrassAlbedoThreshold3: { value: defaultGrassConfig.albedoThreshold3 },
  uGrassAlbedo1: { value: FIELD_GRASS_PALETTE.albedo1 },
  uGrassAlbedo2: { value: FIELD_GRASS_PALETTE.albedo2 },
  uGrassAlbedo3: { value: FIELD_GRASS_PALETTE.albedo3 },
  uGrassAccentAlbedo1: { value: FIELD_GRASS_PALETTE.accentAlbedo1 },
  uGrassAccentAlbedo2: { value: FIELD_GRASS_PALETTE.accentAlbedo2 },
};

const grassVertexDeclarations = [
  'attribute float aGrassSeed;',
  'attribute vec2 aGrassDimensions;',
  'attribute float aGrassAccent;',
  'varying float vGrassAlbedoNoise2;',
  'varying float vGrassAlbedoNoise3;',
  'varying float vGrassCloudVisibility;',
  'varying float vGrassWindSample;',
  'varying float vGrassFakePerspective;',
  'varying float vGrassSeed;',
  'varying float vGrassAccent;',
  'varying vec2 vGrassUv;',
  'uniform float uGrassTime;',
  'uniform float uGrassWindEnabled;',
  'uniform float uGrassAlbedoNoiseEnabled;',
  'uniform float uGrassAlbedoScale2;',
  'uniform float uGrassAlbedoScale3;',
  'uniform float uGrassCloudShadowsEnabled;',
  'uniform sampler2D uGrassAlbedoNoise2;',
  'uniform sampler2D uGrassAlbedoNoise3;',
  'uniform float uGrassSeedPhaseScale;',
  'uniform float uGrassWindSecondaryScaleRatio;',
  'uniform float uGrassWindSecondaryOffsetRatio;',
  'uniform float uGrassAccentOffset1;',
  'uniform float uGrassAccentOffset2;',
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
  'uniform vec3 uGrassCameraRightWorld;',
  'uniform vec3 uGrassCameraNormalWorld;',
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
  '  grassWorldOrigin.z -= aGrassDimensions.y * 0.5 + (aGrassAccent > 1.5 ? uGrassAccentOffset2 : (aGrassAccent > 0.5 ? uGrassAccentOffset1 : 0.0));',
  '#endif',
  'float grassSeed = aGrassSeed;',
  'float grassFrameRate = max(uGrassFramerate, 1.0);',
  'float grassFrameTime = 1.0 / grassFrameRate;',
  'float grassPhase = mod(grassSeed * uGrassSeedPhaseScale, grassFrameTime);',
  'float grassQuantizedTime = floor((uGrassTime + grassPhase) * grassFrameRate + 0.5) / grassFrameRate;',
  'float grassTime = uGrassQuantized > 0.5 ? grassQuantizedTime : uGrassTime;',
  'vec2 grassDirection1 = fieldGrassRotate(uGrassWindDirection, uGrassWindDivergence);',
  'vec2 grassDirection2 = fieldGrassRotate(uGrassWindDirection, -uGrassWindDivergence);',
  'vec2 grassOffset1 = grassTime * uGrassWindSpeed * normalize(grassDirection1);',
  'vec2 grassOffset2 = grassTime * uGrassWindSpeed * normalize(grassDirection2);',
  'float grassWind = 0.0;',
  'if (uGrassWindEnabled > 0.5) {',
  '  float grassNoise1 = texture2D(uGrassWindNoise, grassWorldOrigin.xy * uGrassWindScale + grassOffset1).r;',
  '  float grassNoise2 = texture2D(uGrassWindNoise, grassWorldOrigin.xy * (uGrassWindScale * uGrassWindSecondaryScaleRatio) + grassOffset2 * (uGrassWindSecondaryOffsetRatio * 3.141592653589793 / 3.0)).r;',
  '  grassWind = clamp(grassNoise1 * grassNoise2 + uGrassWindThreshold, 0.0, 1.0);',
  '  grassWind = (grassWind - 0.5) * 2.0;',
  '}',
  'float grassPatch2 = 0.0;',
  'float grassPatch3 = 0.0;',
  'if (uGrassAlbedoNoiseEnabled > 0.5) {',
  '  grassPatch2 = texture2D(uGrassAlbedoNoise2, grassWorldOrigin.xy * uGrassAlbedoScale2).r;',
  '  grassPatch3 = texture2D(uGrassAlbedoNoise3, grassWorldOrigin.xy * uGrassAlbedoScale3).r;',
  '}',
  'vGrassAlbedoNoise2 = grassPatch2;',
  'vGrassAlbedoNoise3 = grassPatch3;',
  'vGrassCloudVisibility = uGrassCloudShadowsEnabled > 0.5 ? fieldCloudVisibility(grassWorldOrigin) : 1.0;',
  'float grassViewSway = sin((grassTime + grassSeed * uGrassSeedPhaseScale) * uGrassViewSwaySpeed * 6.283185307179586) * radians(uGrassViewSwayAngle);',
  'float grassViewCos = cos(grassViewSway);',
  'float grassViewSin = sin(grassViewSway);',
  'vec2 grassViewRotated = vec2(transformed.x * grassViewCos - transformed.y * grassViewSin, transformed.x * grassViewSin + transformed.y * grassViewCos);',
  'float grassWidth = max(aGrassDimensions.x, 0.001);',
  'float grassHeight = max(aGrassDimensions.y, 0.001);',
  'vec3 grassOffsetFromRoot = uGrassCameraRightWorld * (grassViewRotated.x * grassWidth) + vec3(0.0, 0.0, 1.0) * ((grassViewRotated.y + 0.5) * grassHeight);',
  'vec3 grassWindAxis = normalize(vec3(uGrassWindDirection.y, -uGrassWindDirection.x, 0.0));',
  'float grassWorldSway = grassWind * radians(uGrassWindAngle);',
  'float grassWorldCos = cos(grassWorldSway);',
  'float grassWorldSin = sin(grassWorldSway);',
  'vec3 grassRotatedOffset = grassOffsetFromRoot * grassWorldCos + cross(grassWindAxis, grassOffsetFromRoot) * grassWorldSin + grassWindAxis * dot(grassWindAxis, grassOffsetFromRoot) * (1.0 - grassWorldCos);',
  'transformed.x = dot(grassRotatedOffset, uGrassCameraRightWorld) / grassWidth;',
  'transformed.y = dot(grassRotatedOffset, vec3(0.0, 0.0, 1.0)) / grassHeight - 0.5;',
  'transformed.z = dot(grassRotatedOffset, uGrassCameraNormalWorld);',
  'vGrassWindSample = grassWind;',
  'vGrassFakePerspective = grassWind * uGrassWindAlignment;',
  '#ifdef USE_MAP',
  '  float grassPerspective = vGrassFakePerspective * uGrassFakePerspectiveScale;',
  '  vMapUv.x = clamp(0.5 + (vMapUv.x - 0.5) * (1.0 + (1.0 - vMapUv.y) * grassPerspective), 0.0, 1.0);',
  '#endif',
  'vGrassSeed = aGrassSeed;',
  'vGrassAccent = aGrassAccent;',
  'vGrassUv = uv;',
].join('\n');

const grassFragmentDeclarations = [
  'varying float vGrassAlbedoNoise2;',
  'varying float vGrassAlbedoNoise3;',
  'varying float vGrassCloudVisibility;',
  'varying float vGrassWindSample;',
  'varying float vGrassFakePerspective;',
  'varying float vGrassSeed;',
  'varying float vGrassAccent;',
  'varying vec2 vGrassUv;',
  'uniform float uGrassAlbedoNoiseEnabled;',
  'uniform float uGrassCloudShadowCurveExponent;',
  'uniform sampler2D uGrassAccentTexture1;',
  'uniform sampler2D uGrassAccentTexture2;',
  'uniform float uGrassAlbedoThreshold2;',
  'uniform float uGrassAlbedoThreshold3;',
  'uniform vec3 uGrassAlbedo1;',
  'uniform vec3 uGrassAlbedo2;',
  'uniform vec3 uGrassAlbedo3;',
  'uniform vec3 uGrassAccentAlbedo1;',
  'uniform vec3 uGrassAccentAlbedo2;',
  'uniform float uGrassFakePerspectiveScale;',
].join('\n');

const grassColorBody = [
  'diffuseColor.rgb = uGrassAlbedo1 * diffuseColor.rgb;',
  'if (uGrassAlbedoNoiseEnabled > 0.5) {',
  '  float grassPatch2 = vGrassAlbedoNoise2;',
  '  float grassPatch3 = vGrassAlbedoNoise3;',
  '  if (grassPatch2 > uGrassAlbedoThreshold2) diffuseColor.rgb = uGrassAlbedo2;',
  '  if (grassPatch3 > uGrassAlbedoThreshold3) diffuseColor.rgb = uGrassAlbedo3;',
  '}',
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
  'float fieldGrassCloud = vGrassCloudVisibility;',
  '#if NUM_DIR_LIGHTS > 0',
  'float fieldGrassNdotL = max(dot(normalize(normal), directionalLights[0].direction), 0.0);',
  'float fieldGrassDiffuse = min(fieldGrassNdotL, fieldGrassCloud);',
  'float fieldGrassStepped = clamp(fieldGrassDiffuse + mod(1.0 - fieldGrassDiffuse, 1.0 / 3.0), 0.0, 1.0);',
  'float fieldGrassCloudShadow = mix(1.0, pow(fieldGrassCloud, uGrassCloudShadowCurveExponent), uCloudShadowStrength);',
  'float fieldGrassDirectScale = fieldGrassNdotL > 0.0001 ? (fieldGrassStepped / fieldGrassNdotL) * uFieldToonDirectLightScale * fieldGrassCloudShadow : 0.0;',
  'outgoingLight -= reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;',
  'outgoingLight += reflectedLight.directDiffuse * fieldGrassDirectScale;',
  'outgoingLight += reflectedLight.indirectDiffuse * uFieldToonAmbientScale;',
  '#else',
  'outgoingLight *= fieldGrassCloud;',
  '#endif',
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
    alphaTest: 1.0,
    depthWrite: true,
    depthTest: true,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, FIELD_GRASS_UNIFORMS, FIELD_CLOUD_UNIFORMS, FIELD_TOON_LIGHT_UNIFORMS);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\n' + grassVertexDeclarations + '\n' + FIELD_CLOUD_FRAGMENT_DECLARATIONS,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      grassVertexBody,
    );

    // Match Godot's LIGHT_VERTEX = model_origin: receive shadow/light samples at
    // the undeformed grass root so swaying pixel blades do not shimmer.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n' + [
        '#ifdef USE_SHADOWMAP',
        '#ifdef USE_INSTANCING',
        '  worldPosition.xyz = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
        '  worldPosition.z -= aGrassDimensions.y * 0.5 + (aGrassAccent > 1.5 ? uGrassAccentOffset2 : (aGrassAccent > 0.5 ? uGrassAccentOffset1 : 0.0));',
        '#endif',
        '#endif',
      ].join('\n'),
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\n' + grassFragmentDeclarations + '\n' + FIELD_CLOUD_FRAGMENT_DECLARATIONS + '\n' + FIELD_TOON_LIGHT_FRAGMENT_DECLARATIONS,
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

  material.customProgramCacheKey = () => 'twilite-field-grass-v7-vertex-noise';
  return material;
}


/** Apply persisted grass/noise tuning without rebuilding shared materials or textures. */
export function syncFieldGrassConfig(config: FieldConfig['grass']): void {
  FIELD_GRASS_UNIFORMS.uGrassWindEnabled.value = config.windEnabled ? 1 : 0;
  FIELD_GRASS_UNIFORMS.uGrassAlbedoNoiseEnabled.value = config.albedoNoiseEnabled ? 1 : 0;
  FIELD_GRASS_UNIFORMS.uGrassCloudShadowsEnabled.value = config.cloudShadowsEnabled ? 1 : 0;
  FIELD_GRASS_UNIFORMS.uGrassAccentOffset1.value = config.accentOffset1;
  FIELD_GRASS_UNIFORMS.uGrassAccentOffset2.value = config.accentOffset2;
  FIELD_GRASS_UNIFORMS.uGrassSeedPhaseScale.value = config.seedPhaseScale;
  FIELD_GRASS_UNIFORMS.uGrassQuantized.value = config.quantizedAnimation ? 1 : 0;
  FIELD_GRASS_UNIFORMS.uGrassFakePerspectiveScale.value = config.fakePerspectiveScale;
  FIELD_GRASS_UNIFORMS.uGrassWindSecondaryScaleRatio.value = config.windSecondaryScaleRatio;
  FIELD_GRASS_UNIFORMS.uGrassWindSecondaryOffsetRatio.value = config.windSecondaryOffsetRatio;
  FIELD_GRASS_UNIFORMS.uGrassCloudShadowCurveExponent.value = config.cloudShadowCurveExponent;
  FIELD_GRASS_PALETTE.albedo1.set(config.albedoColor1);
  FIELD_GRASS_PALETTE.albedo2.set(config.albedoColor2);
  FIELD_GRASS_PALETTE.albedo3.set(config.albedoColor3);
  FIELD_GRASS_PALETTE.accentAlbedo1.set(config.accentAlbedoColor1);
  FIELD_GRASS_PALETTE.accentAlbedo2.set(config.accentAlbedoColor2);
  FIELD_GRASS_UNIFORMS.uGrassWindDirection.value.set(
    config.windDirectionX,
    config.windDirectionY,
  );
  if (FIELD_GRASS_UNIFORMS.uGrassWindDirection.value.lengthSq() < 0.0001) {
    FIELD_GRASS_UNIFORMS.uGrassWindDirection.value.set(
      defaultGrassConfig.windDirectionX,
      defaultGrassConfig.windDirectionY,
    );
  } else {
    FIELD_GRASS_UNIFORMS.uGrassWindDirection.value.normalize();
  }
  FIELD_GRASS_UNIFORMS.uGrassWindScale.value = config.windScale;
  FIELD_GRASS_UNIFORMS.uGrassWindSpeed.value = config.windSpeed;
  FIELD_GRASS_UNIFORMS.uGrassWindThreshold.value = config.windThreshold;
  FIELD_GRASS_UNIFORMS.uGrassWindDivergence.value = config.windDivergence;
  FIELD_GRASS_UNIFORMS.uGrassWindAngle.value = config.windAngle;
  FIELD_GRASS_UNIFORMS.uGrassFramerate.value = config.windFramerate;
  FIELD_GRASS_UNIFORMS.uGrassViewSwaySpeed.value = config.viewSwaySpeed;
  FIELD_GRASS_UNIFORMS.uGrassViewSwayAngle.value = config.viewSwayAngle;
  FIELD_GRASS_UNIFORMS.uGrassAlbedoScale2.value = config.albedoScale2;
  FIELD_GRASS_UNIFORMS.uGrassAlbedoThreshold2.value = config.albedoThreshold2;
  FIELD_GRASS_UNIFORMS.uGrassAlbedoScale3.value = config.albedoScale3;
  FIELD_GRASS_UNIFORMS.uGrassAlbedoThreshold3.value = config.albedoThreshold3;

  FIELD_CLOUD_UNIFORMS.uCloudScale.value = Math.max(0.001, config.cloudNoiseScale);
  FIELD_CLOUD_UNIFORMS.uCloudSpeed.value = config.cloudSpeed;
  FIELD_CLOUD_UNIFORMS.uCloudContrast.value = config.cloudContrast;
  FIELD_CLOUD_UNIFORMS.uCloudThreshold.value = config.cloudThreshold;
  FIELD_CLOUD_UNIFORMS.uCloudShadowStrength.value = config.cloudShadowStrength;
}

const grassCameraForward = new Vector3();
const grassWorldUp = new Vector3(0, 0, 1);

/** Sync time and derive wind projection from the existing camera pose without moving or rotating it. */
export function syncFieldGrassSceneTime(elapsedTimeSec: number, camera: Camera): void {
  FIELD_GRASS_UNIFORMS.uGrassTime.value = elapsedTimeSec;
  camera.getWorldDirection(grassCameraForward);
  grassCameraForward.z = 0;
  if (grassCameraForward.lengthSq() < 0.0001) {
    grassCameraForward.set(1, 0, 0);
  }
  grassCameraForward.normalize();

  const wind = FIELD_GRASS_UNIFORMS.uGrassWindDirection.value;
  const windLength = Math.hypot(wind.x, wind.y);
  const windX = windLength > 0.0001 ? wind.x / windLength : defaultGrassConfig.windDirectionX;
  const windY = windLength > 0.0001 ? wind.y / windLength : defaultGrassConfig.windDirectionY;
  const cameraRightX = grassCameraForward.y;
  const cameraRightY = -grassCameraForward.x;
  const cameraRightWorld = FIELD_GRASS_UNIFORMS.uGrassCameraRightWorld.value;
  cameraRightWorld.set(cameraRightX, cameraRightY, 0).normalize();
  FIELD_GRASS_UNIFORMS.uGrassCameraNormalWorld.value
    .crossVectors(cameraRightWorld, grassWorldUp)
    .normalize();

  FIELD_GRASS_UNIFORMS.uGrassWindAlignment.value =
    windX * grassCameraForward.x + windY * grassCameraForward.y;
}


let grassSpriteLoadPromise: Promise<void> | null = null;

async function loadBundledPixelTexture(moduleId: number): Promise<Texture> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const imageUri = asset.localUri ?? asset.uri;
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      imageUri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
  if (dimensions.width < 1 || dimensions.height < 1) {
    throw new Error('Grass sprite has invalid image dimensions');
  }

  // Expo GL accepts Expo Asset as its native texture image source.
  const image = Object.assign(asset, dimensions);
  const texture = new Texture(image as unknown as Texture['image']);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Load the replaceable 24 × 24 primary sprite and the original author's two
 * rare accent sprites. On failure, the generated in-memory sprites remain as
 * a safe fallback; the field itself remains renderable.
 */
export function loadFieldGrassSprite(): Promise<void> {
  if (grassSpriteLoadPromise !== null) return grassSpriteLoadPromise;

  grassSpriteLoadPromise = (async () => {
    const created: Texture[] = [];
    try {
      const nextGrass = await loadBundledPixelTexture(grassBladeAsset);
      created.push(nextGrass);
      const nextAccent1 = await loadBundledPixelTexture(grassAccentAsset1);
      created.push(nextAccent1);
      const nextAccent2 = await loadBundledPixelTexture(grassAccentAsset2);
      created.push(nextAccent2);

      const previousTextures = [grassSprite, grassAccentSprite1, grassAccentSprite2];
      grassSprite = nextGrass;
      grassAccentSprite1 = nextAccent1;
      grassAccentSprite2 = nextAccent2;
      FIELD_GRASS_UNIFORMS.uGrassAccentTexture1.value = nextAccent1;
      FIELD_GRASS_UNIFORMS.uGrassAccentTexture2.value = nextAccent2;
      FIELD_GRASS_MATERIAL.map = nextGrass;
      FIELD_GRASS_MATERIAL.needsUpdate = true;
      previousTextures.forEach((texture) => texture.dispose());
    } catch (error) {
      created.forEach((texture) => texture.dispose());
      console.warn('Unable to load all bundled grass sprites; using generated fallback textures.', error);
      grassSpriteLoadPromise = null;
    }
  })();

  return grassSpriteLoadPromise;
}
