import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
} from 'three';

const MAP_SIZE = 256;
const TOP_UV_START = 0.2;
const TOP_UV_SIZE = 0.6;
const SIDE_UV_WIDTH = 0.06;

export type FieldOccupiedTileMaps = {
  readonly albedo: DataTexture;
  readonly roughness: DataTexture;
};

type Scratch = {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly halfWidth: number;
  readonly strength: number;
};

let cachedMaps: FieldOccupiedTileMaps | null = null;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mix(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function smoothstep(min: number, max: number, value: number): number {
  const t = clamp01((value - min) / Math.max(0.000001, max - min));
  return t * t * (3 - 2 * t);
}

function hash2(x: number, y: number, seed: number): number {
  let value =
    (Math.imul(x | 0, 374761393) +
      Math.imul(y | 0, 668265263) +
      Math.imul(seed | 0, 1442695041)) |
    0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = mix(hash2(x0, y0, seed), hash2(x0 + 1, y0, seed), sx);
  const b = mix(hash2(x0, y0 + 1, seed), hash2(x0 + 1, y0 + 1, seed), sx);
  return mix(a, b, sy);
}

function topNoise(x: number, y: number): number {
  return (
    valueNoise(x * 3.5, y * 3.5, 11) * 0.42 +
    valueNoise(x * 8.5, y * 8.5, 23) * 0.29 +
    valueNoise(x * 19, y * 19, 37) * 0.19 +
    valueNoise(x * 43, y * 43, 59) * 0.1
  );
}

function createScratches(): Scratch[] {
  return Array.from({ length: 34 }, (_, index) => {
    const seed = index + 101;
    const angle = hash2(index, 1, seed) * Math.PI * 2;
    const length = 0.018 + hash2(index, 2, seed) * 0.078;
    return {
      x: 0.04 + hash2(index, 3, seed) * 0.92,
      y: 0.04 + hash2(index, 4, seed) * 0.92,
      dx: Math.cos(angle) * length,
      dy: Math.sin(angle) * length,
      halfWidth: 0.0015 + hash2(index, 5, seed) * 0.003,
      strength: hash2(index, 6, seed) > 0.46 ? 1 : -1,
    };
  });
}

function distanceToSegment(
  x: number,
  y: number,
  scratch: Scratch,
): number {
  const vx = scratch.dx;
  const vy = scratch.dy;
  const lengthSquared = vx * vx + vy * vy;
  const t = clamp01(
    ((x - scratch.x) * vx + (y - scratch.y) * vy) /
      Math.max(lengthSquared, 0.000001),
  );
  const dx = x - (scratch.x + vx * t);
  const dy = y - (scratch.y + vy * t);
  return Math.sqrt(dx * dx + dy * dy);
}

function sideDepth(u: number, v: number): number | null {
  if (u >= 0.2 && u <= 0.8 && v >= 0.8 && v <= 0.86) {
    return (v - 0.8) / SIDE_UV_WIDTH;
  }
  if (u >= 0.2 && u <= 0.8 && v >= 0.14 && v <= 0.2) {
    return (0.2 - v) / SIDE_UV_WIDTH;
  }
  if (v >= 0.2 && v <= 0.8 && u >= 0.8 && u <= 0.86) {
    return (u - 0.8) / SIDE_UV_WIDTH;
  }
  if (v >= 0.2 && v <= 0.8 && u >= 0.14 && u <= 0.2) {
    return (0.2 - u) / SIDE_UV_WIDTH;
  }
  return null;
}

function setPixel(
  data: Uint8Array,
  pixelIndex: number,
  red: number,
  green: number,
  blue: number,
): void {
  const offset = pixelIndex * 4;
  data[offset] = Math.round(Math.max(0, Math.min(255, red)));
  data[offset + 1] = Math.round(Math.max(0, Math.min(255, green)));
  data[offset + 2] = Math.round(Math.max(0, Math.min(255, blue)));
  data[offset + 3] = 255;
}

function createAlbedoData(scratches: readonly Scratch[]): Uint8Array {
  const data = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
  const topEnd = TOP_UV_START + TOP_UV_SIZE;

  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const u = (x + 0.5) / MAP_SIZE;
      const v = (y + 0.5) / MAP_SIZE;
      const pixelIndex = y * MAP_SIZE + x;

      if (u >= TOP_UV_START && u <= topEnd && v >= TOP_UV_START && v <= topEnd) {
        const px = (u - TOP_UV_START) / TOP_UV_SIZE;
        const py = (v - TOP_UV_START) / TOP_UV_SIZE;
        const cloud = topNoise(px, py);
        const grain = hash2(x, y, 811) - 0.5;
        const radius = Math.sqrt((px - 0.5) ** 2 * 0.82 + (py - 0.5) ** 2);
        const wearNoise = valueNoise(px * 9 + 4, py * 9 - 2, 97);
        const centralWear =
          (1 - smoothstep(0.12, 0.52, radius)) * (0.58 + wearNoise * 0.42);
        const mottled = 0.82 + cloud * 0.34;

        let red = 61 * mottled;
        let green = 29 * mottled;
        let blue = 19 * mottled;

        // Soft, irregularly worn bronze in the centre. The effect is low
        // contrast so the tile remains metal-like rather than looking dirty.
        const wearAmount = centralWear * 0.24;
        red = mix(red, 111, wearAmount);
        green = mix(green, 73, wearAmount);
        blue = mix(blue, 51, wearAmount);

        // Sparse hairline scuffs catch just enough contrast at close range.
        let scratchAmount = 0;
        for (const scratch of scratches) {
          const distance = distanceToSegment(px, py, scratch);
          const line = 1 - smoothstep(scratch.halfWidth * 0.45, scratch.halfWidth * 1.6, distance);
          scratchAmount += line * scratch.strength * 5.5;
        }
        const speckle = (hash2(Math.floor(px * 68), Math.floor(py * 68), 131) - 0.5) * 5;
        const wearVariation = (wearNoise - 0.5) * centralWear * 5;
        const edgeDistance = Math.min(px, 1 - px, py, 1 - py);
        const edgeShade = 1 - smoothstep(0.002, 0.025, edgeDistance);

        const totalVariation = grain * 6 + speckle + wearVariation + scratchAmount;
        const edgeFactor = 1 - edgeShade * 0.025;
        setPixel(
          data,
          pixelIndex,
          red * edgeFactor + totalVariation,
          green * edgeFactor + totalVariation * 0.72,
          blue * edgeFactor + totalVariation * 0.52,
        );
        continue;
      }

      const depth = sideDepth(u, v);
      if (depth !== null) {
        const roughMetalBody = 0.78 + (valueNoise(u * 140, v * 140, 211) - 0.5) * 9;
        const bevelBlend = 1 - smoothstep(0.04, 0.24, depth);
        const red = mix(39, 57, bevelBlend) + roughMetalBody;
        const green = mix(18, 28, bevelBlend) + roughMetalBody * 0.58;
        const blue = mix(12, 18, bevelBlend) + roughMetalBody * 0.38;
        setPixel(data, pixelIndex, red, green, blue);
        continue;
      }

      // Deep side walls and the underside stay dark; only the lit chamfer
      // should create a bright edge in the rendered scene.
      const variation = (hash2(x, y, 313) - 0.5) * 5;
      setPixel(data, pixelIndex, 30 + variation, 14 + variation * 0.6, 10 + variation * 0.4);
    }
  }

  return data;
}

function createRoughnessData(): Uint8Array {
  const data = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
  const topEnd = TOP_UV_START + TOP_UV_SIZE;

  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const u = (x + 0.5) / MAP_SIZE;
      const v = (y + 0.5) / MAP_SIZE;
      const pixelIndex = y * MAP_SIZE + x;
      let roughness = 0.82;

      if (u >= TOP_UV_START && u <= topEnd && v >= TOP_UV_START && v <= topEnd) {
        const px = (u - TOP_UV_START) / TOP_UV_SIZE;
        const py = (v - TOP_UV_START) / TOP_UV_SIZE;
        const cloud = topNoise(px, py);
        const radius = Math.sqrt((px - 0.5) ** 2 + (py - 0.5) ** 2);
        const wornCentre = (1 - smoothstep(0.12, 0.5, radius)) * 0.08;
        const nearEdge = 1 - smoothstep(0.006, 0.045, Math.min(px, 1 - px, py, 1 - py));
        roughness = 0.64 + (cloud - 0.5) * 0.22 + wornCentre - nearEdge * 0.12;
      } else {
        const depth = sideDepth(u, v);
        if (depth !== null) {
          const variation = (valueNoise(u * 120, v * 120, 401) - 0.5) * 0.08;
          const bevelBlend = 1 - smoothstep(0.06, 0.22, depth);
          roughness = mix(0.78, 0.31, bevelBlend) + variation;
        }
      }

      const value = Math.round(clamp01(roughness) * 255);
      setPixel(data, pixelIndex, value, value, value);
    }
  }

  return data;
}

function createTexture(data: Uint8Array): DataTexture {
  const texture = new DataTexture(data, MAP_SIZE, MAP_SIZE, RGBAFormat);
  // The albedo bytes are sRGB-encoded and decoded explicitly by the custom shader.\n  // Keep the texture itself in NoColorSpace to avoid hardware double-decoding.\n  texture.colorSpace = NoColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a tiny shared UV atlas once per app process. The central island is
 * worn copper/amber; the perimeter islands match the tile side-wall UV layout.
 */
export function getFieldOccupiedTileMaps(): FieldOccupiedTileMaps {
  if (cachedMaps !== null) return cachedMaps;
  const scratches = createScratches();
  cachedMaps = {
    albedo: createTexture(createAlbedoData(scratches)),
    roughness: createTexture(createRoughnessData()),
  };
  return cachedMaps;
}
