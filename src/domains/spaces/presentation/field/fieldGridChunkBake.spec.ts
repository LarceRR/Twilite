import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { WebGLRenderer } from 'three';

import {
  bakeFieldChunk,
  clearFieldChunkBakeCache,
  fieldChunkBakeCacheKey,
  fieldChunkBakeCacheSize,
  fieldChunkPrefetchIndices,
  fieldChunkTexturePoolSize,
  peekFieldChunkBake,
  prepareFieldChunkTexture,
  pumpFieldChunkGpuUploads,
  pendingFieldChunkGpuUploads,
  isFieldChunkGpuReady,
  resolveMountedChunkIds,
  syncMountedChunkWindow,
  evictFieldChunkBakes,
} from './fieldGridChunkBake';
import type { FieldGridLayerFlags, FieldGridTextureColors } from './fieldGridLabelPixels';

const COLORS: FieldGridTextureColors = {
  fill: [10, 20, 30, 255],
  line: [200, 200, 200, 255],
  text: [1, 2, 3, 255],
};

const LAYERS: FieldGridLayerFlags = {
  showActiveCells: true,
  showActiveCenters: true,
  showCellLabels: true,
};

function request(chunkIndex: number) {
  return {
    chunkIndex,
    base: { rows: 15, cellSize: 60 },
    colors: COLORS,
    layers: LAYERS,
  };
}

describe('fieldGridChunkBake', () => {
  beforeEach(() => {
    clearFieldChunkBakeCache();
  });

  it('builds prefetch targets beyond the visible window', () => {
    expect(fieldChunkPrefetchIndices([0, 1, 2], 2)).toEqual([0, 1, 2, 3, 4]);
  });

  it('caches baked chunk pixels for reuse', () => {
    const req = request(1);
    expect(peekFieldChunkBake(req)).toBeNull();
    const first = bakeFieldChunk(req);
    const second = bakeFieldChunk(req);
    expect(second).toBe(first);
    expect(first.width).toBe(600);
    expect(first.height).toBe(900);
    expect(fieldChunkBakeCacheSize()).toBe(1);
    expect(fieldChunkBakeCacheKey(req)).toContain('1|');
  });

  it('evicts bakes outside the keep set', () => {
    bakeFieldChunk(request(0));
    bakeFieldChunk(request(3));
    evictFieldChunkBakes([3, 4]);
    expect(fieldChunkBakeCacheSize()).toBe(1);
    expect(peekFieldChunkBake(request(3))).not.toBeNull();
  });

  it('pools DataTexture and marks GPU-ready only after initTexture pump', () => {
    const req = request(2);
    const texture = prepareFieldChunkTexture(req);
    expect(texture).toBeTruthy();
    expect(fieldChunkTexturePoolSize()).toBe(1);
    expect(isFieldChunkGpuReady(req)).toBe(false);
    expect(pendingFieldChunkGpuUploads()).toBe(1);

    const initTexture = vi.fn();
    const renderer = { initTexture } as unknown as WebGLRenderer;
    expect(pumpFieldChunkGpuUploads(renderer, 1)).toBe(1);
    expect(initTexture).toHaveBeenCalledWith(texture);
    expect(isFieldChunkGpuReady(req)).toBe(true);
    expect(pendingFieldChunkGpuUploads()).toBe(0);
    expect(prepareFieldChunkTexture(req)).toBe(texture);
  });

  it('resolveMountedChunkIds waits for GPU-ready after bootstrap', () => {
    const ready = new Set([1, 2, 3]);
    const isReady = (id: number) => ready.has(id);

    expect(resolveMountedChunkIds([0, 1, 2, 3], [], isReady, true)).toEqual([0, 1, 2, 3]);
    expect(resolveMountedChunkIds([1, 2, 3, 4], [0, 1, 2, 3], isReady, false)).toEqual([
      1, 2, 3,
    ]);
    expect(resolveMountedChunkIds([4, 5], [1, 2, 3], () => false, false)).toEqual([1, 2, 3]);
  });

  it('syncMountedChunkWindow reports change only when mount set changes', () => {
    const ready = () => true;
    const first = syncMountedChunkWindow(-469, 60, [], ready, true);
    expect(first.mountedChanged).toBe(true);
    const same = syncMountedChunkWindow(-469, 60, first.mounted, ready, true);
    expect(same.mountedChanged).toBe(false);
    expect(same.mounted).toEqual(first.mounted);
  });
});
