import { InteractionManager } from 'react-native';
import {
  DataTexture,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  type WebGLRenderer,
} from 'three';

import {
  createFieldGridChunkSpec,
  fieldChunkConfigsEqual,
  fieldChunkIndicesForCameraX,
  fieldChunkToGridConfig,
  type FieldGridChunkSpec,
} from './fieldGridChunks';
import type { FieldGridConfig } from './fieldGridConfig';
import {
  buildFieldGridLabelPixels,
  type FieldGridLayerFlags,
  type FieldGridTextureColors,
  type Rgba,
} from './fieldGridLabelPixels';

export type FieldChunkBakeRequest = {
  readonly chunkIndex: number;
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize'>;
  readonly colors: FieldGridTextureColors;
  readonly layers: FieldGridLayerFlags;
};

export type FieldChunkBakeResult = {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
};

type PooledTexture = {
  readonly key: string;
  readonly chunkIndex: number;
  readonly texture: DataTexture;
  gpuReady: boolean;
};

const bakeCache = new Map<string, FieldChunkBakeResult>();
const texturePool = new Map<string, PooledTexture>();
const inflight = new Set<string>();
const uploadQueue: string[] = [];
let bakeQueue: Promise<void> = Promise.resolve();

function rgbaKey(c: Rgba): string {
  return `${c[0]},${c[1]},${c[2]},${c[3]}`;
}

export function fieldChunkBakeCacheKey(request: FieldChunkBakeRequest): string {
  const { chunkIndex, base, colors, layers } = request;
  return [
    chunkIndex,
    base.rows,
    base.cellSize,
    layers.showActiveCells ? 1 : 0,
    layers.showActiveCenters ? 1 : 0,
    layers.showCellLabels ? 1 : 0,
    rgbaKey(colors.fill),
    rgbaKey(colors.line),
    rgbaKey(colors.text),
  ].join('|');
}

/** Chunk indices to warm beyond the mounted window. */
export function fieldChunkPrefetchIndices(
  visible: readonly number[],
  extraAhead: number = 2,
): readonly number[] {
  if (visible.length === 0) return [];
  const maxVisible = visible[visible.length - 1]!;
  const ids = new Set(visible);
  for (let i = 1; i <= extraAhead; i += 1) {
    ids.add(maxVisible + i);
  }
  return [...ids].sort((a, b) => a - b);
}

/**
 * Sticky mount set: after bootstrap, only mount GPU-ready desired chunks so
 * the first appearance never does a surprise texImage2D on the critical path.
 * During bootstrap, mount the full desired window (one-time startup cost).
 */
export function resolveMountedChunkIds(
  desired: readonly number[],
  previous: readonly number[],
  isGpuReady: (chunkIndex: number) => boolean,
  allowUnready: boolean,
): readonly number[] {
  if (allowUnready) return desired;
  const ready = desired.filter((id) => isGpuReady(id));
  if (ready.length > 0) return ready;
  return previous;
}

/** Pure window sync for useFrame (no React). Returns null mounted when unchanged. */
export function syncMountedChunkWindow(
  cameraX: number,
  cellSize: number,
  previousMounted: readonly number[],
  isGpuReady: (chunkIndex: number) => boolean,
  allowUnready: boolean,
): {
  readonly desired: readonly number[];
  readonly mounted: readonly number[];
  readonly mountedChanged: boolean;
} {
  const desired = fieldChunkIndicesForCameraX(cameraX, cellSize);
  const mounted = resolveMountedChunkIds(
    desired,
    previousMounted,
    isGpuReady,
    allowUnready,
  );
  return {
    desired,
    mounted,
    mountedChanged: !fieldChunkConfigsEqual(previousMounted, mounted),
  };
}

export function pendingFieldChunkGpuUploads(): number {
  return uploadQueue.length;
}

export function peekFieldChunkBake(
  request: FieldChunkBakeRequest,
): FieldChunkBakeResult | null {
  return bakeCache.get(fieldChunkBakeCacheKey(request)) ?? null;
}

export function bakeFieldChunk(request: FieldChunkBakeRequest): FieldChunkBakeResult {
  const key = fieldChunkBakeCacheKey(request);
  const hit = bakeCache.get(key);
  if (hit != null) return hit;

  const spec: FieldGridChunkSpec = createFieldGridChunkSpec(
    request.chunkIndex,
    request.base,
  );
  const baked = buildFieldGridLabelPixels(
    fieldChunkToGridConfig(spec),
    request.colors,
    request.layers,
    spec.colStart,
  );
  const result: FieldChunkBakeResult = {
    data: baked.data,
    width: baked.width,
    height: baked.height,
  };
  bakeCache.set(key, result);
  return result;
}

function createPooledTexture(
  key: string,
  chunkIndex: number,
  baked: FieldChunkBakeResult,
): PooledTexture {
  const texture = new DataTexture(baked.data, baked.width, baked.height, RGBAFormat);
  texture.colorSpace = NoColorSpace;
  texture.flipY = false;
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const entry: PooledTexture = { key, chunkIndex, texture, gpuReady: false };
  texturePool.set(key, entry);
  uploadQueue.push(key);
  return entry;
}

/** CPU bake + DataTexture alloc; GPU upload is deferred via pumpFieldChunkGpuUploads. */
export function prepareFieldChunkTexture(request: FieldChunkBakeRequest): DataTexture {
  const key = fieldChunkBakeCacheKey(request);
  const existing = texturePool.get(key);
  if (existing != null) return existing.texture;
  const baked = bakeFieldChunk(request);
  return createPooledTexture(key, request.chunkIndex, baked).texture;
}

export function isFieldChunkGpuReady(request: FieldChunkBakeRequest): boolean {
  const entry = texturePool.get(fieldChunkBakeCacheKey(request));
  return entry?.gpuReady === true;
}

export function isFieldChunkIndexGpuReady(
  chunkIndex: number,
  base: FieldChunkBakeRequest['base'],
  colors: FieldGridTextureColors,
  layers: FieldGridLayerFlags,
): boolean {
  return isFieldChunkGpuReady({ chunkIndex, base, colors, layers });
}

/**
 * Upload at most `maxPerFrame` pending textures.
 * Call from useFrame with the R3F/WebGL renderer — production pattern for hitch-free streaming.
 */
export function pumpFieldChunkGpuUploads(
  renderer: WebGLRenderer,
  maxPerFrame: number = 1,
): number {
  let uploaded = 0;
  while (uploaded < maxPerFrame && uploadQueue.length > 0) {
    const key = uploadQueue.shift();
    if (key == null) break;
    const entry = texturePool.get(key);
    if (entry == null || entry.gpuReady) continue;
    renderer.initTexture(entry.texture);
    entry.gpuReady = true;
    uploaded += 1;
  }
  return uploaded;
}

function scheduleBakeTask(task: () => void): void {
  bakeQueue = bakeQueue.then(
    () =>
      new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              try {
                task();
              } finally {
                resolve();
              }
            }, 0);
          });
        });
      }),
  );
}

/** Background: bake pixels + allocate texture; GPU upload happens later via pump. */
export function prefetchFieldChunk(request: FieldChunkBakeRequest): void {
  const key = fieldChunkBakeCacheKey(request);
  if (texturePool.has(key) || inflight.has(key)) return;
  if (bakeCache.has(key) && !texturePool.has(key)) {
    createPooledTexture(key, request.chunkIndex, bakeCache.get(key)!);
    return;
  }
  inflight.add(key);
  scheduleBakeTask(() => {
    try {
      prepareFieldChunkTexture(request);
    } finally {
      inflight.delete(key);
    }
  });
}

export function evictFieldChunkBakes(keepChunkIndices: readonly number[]): void {
  const keep = new Set(keepChunkIndices);
  for (const key of [...bakeCache.keys()]) {
    const chunkIndex = Number(key.split('|')[0]);
    if (!keep.has(chunkIndex)) bakeCache.delete(key);
  }
  for (const [key, entry] of [...texturePool.entries()]) {
    if (!keep.has(entry.chunkIndex)) {
      entry.texture.dispose();
      texturePool.delete(key);
    }
  }
  for (let i = uploadQueue.length - 1; i >= 0; i -= 1) {
    const key = uploadQueue[i]!;
    if (!texturePool.has(key)) uploadQueue.splice(i, 1);
  }
}

export function clearFieldChunkBakeCache(): void {
  for (const entry of texturePool.values()) {
    entry.texture.dispose();
  }
  bakeCache.clear();
  texturePool.clear();
  inflight.clear();
  uploadQueue.length = 0;
  bakeQueue = Promise.resolve();
}

export function fieldChunkBakeCacheSize(): number {
  return bakeCache.size;
}

export function fieldChunkTexturePoolSize(): number {
  return texturePool.size;
}
