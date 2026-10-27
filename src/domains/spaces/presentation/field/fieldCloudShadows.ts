import {
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  Vector2,
  Vector3,
} from 'three';

/**
 * Tileable grayscale noise used by the grass wind, colour patches and cloud
 * shadows. Godot's FastNoiseLite NoiseTexture2D is generated procedurally, so
 * this creates a small seamless equivalent instead of shipping a baked map.
 */
export function createFieldNoiseTexture(seed: number, size = 128): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const octaveCells = [3, 6, 12, 24];
  const octaveWeights = [0.48, 0.27, 0.16, 0.09];

  const hash = (x: number, y: number, octave: number): number => {
    const value = Math.sin(
      (x + seed * 17.17 + octave * 41.31) * 127.1 +
      (y + seed * 7.73 + octave * 19.19) * 311.7,
    ) * 43758.5453123;
    return value - Math.floor(value);
  };

  const sampleOctave = (u: number, v: number, cells: number, octave: number): number => {
    const px = u * cells;
    const py = v * cells;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const tx0 = px - x0;
    const ty0 = py - y0;
    const tx = tx0 * tx0 * (3 - 2 * tx0);
    const ty = ty0 * ty0 * (3 - 2 * ty0);
    const wrap = (n: number): number => ((n % cells) + cells) % cells;
    const top = hash(wrap(x0), wrap(y0), octave) * (1 - tx) +
      hash(wrap(x0 + 1), wrap(y0), octave) * tx;
    const bottom = hash(wrap(x0), wrap(y0 + 1), octave) * (1 - tx) +
      hash(wrap(x0 + 1), wrap(y0 + 1), octave) * tx;
    return top * (1 - ty) + bottom * ty;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      let value = 0;
      for (let octave = 0; octave < octaveCells.length; octave += 1) {
        value += sampleOctave(u, v, octaveCells[octave]!, octave) * octaveWeights[octave]!;
      }
      const channel = Math.max(0, Math.min(255, Math.round(value * 255)));
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

const cloudNoiseTexture = createFieldNoiseTexture(9041);

/**
 * Adapted from Dylearn's Demo.tscn. Twilite uses 100 world units per metre,
 * so the original 40-unit cloud scale / 50-unit cloud height become 4000 / 5000.
 * Directional light and world axes are converted from Godot's Y-up to Twilite's Z-up.
 */
export const FIELD_CLOUD_UNIFORMS = {
  uCloudNoise: { value: cloudNoiseTexture },
  uCloudTime: { value: 0 },
  uCloudScale: { value: 4000 },
  uCloudWorldHeight: { value: 5000 },
  uCloudSpeed: { value: -0.01 },
  uCloudContrast: { value: 3.845 },
  uCloudThreshold: { value: 0.27 },
  uCloudDirection: { value: new Vector2(0, -1) },
  uCloudLightDirection: { value: new Vector3(0.2, -0.15, 1).normalize() },
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

export function syncFieldCloudLightDirection(
  direction: readonly [number, number, number],
): void {
  const light = FIELD_CLOUD_UNIFORMS.uCloudLightDirection.value;
  light.set(direction[0], direction[1], direction[2]);
  if (light.lengthSq() < 0.0001) {
    light.set(0.2, -0.15, 1);
  }
  light.normalize();
}
