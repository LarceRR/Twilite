import {
  DataTexture,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  type WebGLRenderer,
} from 'three';

import { hexToRgbaTuple, type FieldConfig } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';
import { FIELD_GRID_DIVIDER_WIDTH } from './fieldGridConfig';
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
  readonly base: Pick<FieldGridConfig, 'rows' | 'cellSize' | 'dividerWidth'>;
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

type PendingBake = {
  readonly key: string;
  readonly request: FieldChunkBakeRequest;
  readonly runtimeConfig: FieldConfig;
  readonly sequence: number;
  priority: number;
};

const pendingBakes = new Map<string, PendingBake>();
let bakePumpScheduled = false;
let bakeSequence = 0;

function rgbaKey(c: Rgba): string {
  return `${c[0]},${c[1]},${c[2]},${c[3]}`;
}

export function fieldChunkBakeCacheKey(
  request: FieldChunkBakeRequest,
  runtimeConfig: FieldConfig = getFieldConfig(),
): string {
  const { chunkIndex, base, colors, layers } = request;
  const { labels, activeCells } = runtimeConfig;
  return [
    chunkIndex,
    base.rows,
    base.cellSize,
    base.dividerWidth ?? FIELD_GRID_DIVIDER_WIDTH,
    layers.showActiveCells ? 1 : 0,
    layers.showActiveCenters ? 1 : 0,
    layers.showCellLabels ? 1 : 0,
    rgbaKey(colors.fill),
    rgbaKey(colors.line),
    rgbaKey(colors.text),
    rgbaKey(colors.activeFill ?? hexToRgbaTuple(activeCells.fillHex)),
    rgbaKey(colors.activeCenter ?? hexToRgbaTuple(activeCells.centerHex)),
    labels.scale,
    labels.padding,
    labels.raise,
    labels.activeCenterSize,
    labels.activeBorder,
    activeCells.sideSpan,
    runtimeConfig.chunks.cols,
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
  if (desired.length === 0) return [];

  const ready = desired.filter((id) => isGpuReady(id));
  if (ready.length === 0) return previous;
  if (ready.length === desired.length) return ready;

  // Keep the immediately preceding ready chunk until the incoming edge chunk
  // is ready. It fills the same recycled slot and avoids a visible gap while
  // the new texture is still being prepared/uploaded.
  const previousEdge = desired[0]! - 1;
  if (previousEdge >= 0 && previous.includes(previousEdge) && isGpuReady(previousEdge)) {
    return [previousEdge, ...ready];
  }

  return ready;
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
  runtimeConfig: FieldConfig = getFieldConfig(),
): FieldChunkBakeResult | null {
  return bakeCache.get(fieldChunkBakeCacheKey(request, runtimeConfig)) ?? null;
}

export function bakeFieldChunk(
  request: FieldChunkBakeRequest,
  runtimeConfig: FieldConfig = getFieldConfig(),
): FieldChunkBakeResult {
  const key = fieldChunkBakeCacheKey(request, runtimeConfig);
  const hit = bakeCache.get(key);
  if (hit != null) return hit;

  const spec: FieldGridChunkSpec = createFieldGridChunkSpec(
    request.chunkIndex,
    request.base,
    runtimeConfig.chunks.cols,
  );
  const baked = buildFieldGridLabelPixels(
    fieldChunkToGridConfig(spec),
    request.colors,
    request.layers,
    spec.colStart,
    runtimeConfig,
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
export function prepareFieldChunkTexture(
  request: FieldChunkBakeRequest,
  runtimeConfig: FieldConfig = getFieldConfig(),
): DataTexture {
  const key = fieldChunkBakeCacheKey(request, runtimeConfig);
  const existing = texturePool.get(key);
  if (existing != null) return existing.texture;
  const baked = bakeFieldChunk(request, runtimeConfig);
  return createPooledTexture(key, request.chunkIndex, baked).texture;
}

export function isFieldChunkGpuReady(
  request: FieldChunkBakeRequest,
  runtimeConfig: FieldConfig = getFieldConfig(),
): boolean {
  const entry = texturePool.get(fieldChunkBakeCacheKey(request, runtimeConfig));
  return entry?.gpuReady === true;
}

export function isFieldChunkIndexGpuReady(
  chunkIndex: number,
  base: FieldChunkBakeRequest['base'],
  colors: FieldGridTextureColors,
  layers: FieldGridLayerFlags,
  runtimeConfig: FieldConfig = getFieldConfig(),
): boolean {
  return isFieldChunkGpuReady({ chunkIndex, base, colors, layers }, runtimeConfig);
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

function scheduleBakePump(): void {
  if (bakePumpScheduled || pendingBakes.size === 0) return;
  bakePumpScheduled = true;

  // Yield between bakes, but do not wait for interactions to finish: chunk
  // preparation must progress while a native gesture is still moving.
  requestAnimationFrame(() => {
    setTimeout(() => {
      bakePumpScheduled = false;
      let next: PendingBake | undefined;
      for (const candidate of pendingBakes.values()) {
        if (
          next === undefined ||
          candidate.priority > next.priority ||
          (candidate.priority === next.priority && candidate.sequence < next.sequence)
        ) {
          next = candidate;
        }
      }

      try {
        if (next !== undefined) {
          pendingBakes.delete(next.key);
          try {
            // Eviction can cancel pending work while the callback is waiting.
            // A texture may also have been prepared synchronously by a mounted
            // slot; in either case the in-flight marker must always be cleared.
            if (inflight.has(next.key) && !texturePool.has(next.key)) {
              prepareFieldChunkTexture(next.request, next.runtimeConfig);
            }
          } finally {
            inflight.delete(next.key);
          }
        }
      } catch (error) {
        // A bad chunk must not permanently stall the queue for all later chunks.
        console.error('Failed to prepare a field chunk texture', error);
      } finally {
        scheduleBakePump();
      }
    }, 0);
  });
}

/** Deferred CPU bake and texture allocation; GPU upload is deferred to a frame pump. */
export function prefetchFieldChunk(
  request: FieldChunkBakeRequest,
  priority: number = 0,
  runtimeConfig: FieldConfig = getFieldConfig(),
): void {
  const key = fieldChunkBakeCacheKey(request, runtimeConfig);
  if (texturePool.has(key)) return;

  const existing = pendingBakes.get(key);
  if (existing !== undefined) {
    existing.priority = Number.isFinite(priority) ? priority : 0;
    return;
  }
  // A request already selected by the scheduler is running synchronously.
  if (inflight.has(key)) return;

  inflight.add(key);
  pendingBakes.set(key, {
    key,
    request,
    runtimeConfig,
    priority: Number.isFinite(priority) ? priority : 0,
    sequence: bakeSequence++,
  });
  scheduleBakePump();
}

/** Reorder queued uploads so chunks closest to the camera are uploaded first. */
export function prioritizeFieldChunkGpuUploads(
  priorityChunkIndices: readonly number[],
): void {
  if (uploadQueue.length < 2 || priorityChunkIndices.length === 0) return;

  const priority = new Map<number, number>();
  priorityChunkIndices.forEach((chunkIndex, index) => {
    if (!priority.has(chunkIndex)) priority.set(chunkIndex, index);
  });
  const originalOrder = new Map(uploadQueue.map((key, index) => [key, index] as const));

  uploadQueue.sort((left, right) => {
    const leftChunk = texturePool.get(left)?.chunkIndex;
    const rightChunk = texturePool.get(right)?.chunkIndex;
    const leftRank =
      leftChunk === undefined
        ? Number.MAX_SAFE_INTEGER
        : (priority.get(leftChunk) ?? Number.MAX_SAFE_INTEGER);
    const rightRank =
      rightChunk === undefined
        ? Number.MAX_SAFE_INTEGER
        : (priority.get(rightChunk) ?? Number.MAX_SAFE_INTEGER);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return (originalOrder.get(left) ?? 0) - (originalOrder.get(right) ?? 0);
  });
}

export function evictFieldChunkBakes(
  keepChunkIndices: readonly number[],
  keepCacheKeys?: readonly string[],
): void {
  const keep = new Set(keepChunkIndices);
  const keepKeys = keepCacheKeys == null ? null : new Set(keepCacheKeys);

  // Remove obsolete queued bakes, not just their eventual cache entries. A
  // fast swipe can otherwise leave a backlog of chunks the camera has passed.
  for (const [key, pending] of pendingBakes) {
    if (
      !keep.has(pending.request.chunkIndex) ||
      (keepKeys !== null && !keepKeys.has(key))
    ) {
      pendingBakes.delete(key);
      inflight.delete(key);
    }
  }
  for (const key of [...bakeCache.keys()]) {
    const chunkIndex = Number(key.split('|')[0]);
    if (!keep.has(chunkIndex) || (keepKeys !== null && !keepKeys.has(key))) {
      bakeCache.delete(key);
    }
  }
  for (const [key, entry] of [...texturePool.entries()]) {
    if (!keep.has(entry.chunkIndex) || (keepKeys !== null && !keepKeys.has(key))) {
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
  pendingBakes.clear();
  uploadQueue.length = 0;
}

export function fieldChunkBakeCacheSize(): number {
  return bakeCache.size;
}

export function fieldChunkTexturePoolSize(): number {
  return texturePool.size;
}
