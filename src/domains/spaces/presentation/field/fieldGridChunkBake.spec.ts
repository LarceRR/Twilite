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
  prioritizeFieldChunkGpuUploads,
  isFieldChunkGpuReady,
  resolveMountedChunkIds,
  requeueFieldChunkGpuUploadsAfterContextRestore,
  syncMountedChunkWindow,
  evictFieldChunkBakes,
} from './fieldGridChunkBake';
import type { FieldGridLayerFlags, FieldGridTextureColors } from './fieldGridLabelPixels';
import { useFieldConfigStore } from './fieldConfigStore';

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
    useFieldConfigStore.getState().reset();
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
    expect(first.width).toBe(610);
    expect(first.height).toBe(916);
    expect(fieldChunkBakeCacheSize()).toBe(1);
    expect(fieldChunkBakeCacheKey(req)).toContain('1|');
  });

  it('uses separate cached textures when visual dividers are hidden', () => {
    const visible = { ...request(1), base: { rows: 15, cellSize: 60, dividerWidth: 1, showDividers: true } };
    const hidden = { ...request(1), base: { rows: 15, cellSize: 60, dividerWidth: 1, showDividers: false } };
    expect(fieldChunkBakeCacheKey(visible)).not.toBe(fieldChunkBakeCacheKey(hidden));
  });

  it('includes active colors and label layout in the texture cache key', () => {
    const original = request(1);
    const originalKey = fieldChunkBakeCacheKey(original);
    const customActiveFill = {
      ...original,
      colors: { ...COLORS, activeFill: [90, 80, 70, 255] as const },
    };

    expect(fieldChunkBakeCacheKey(customActiveFill)).not.toBe(originalKey);

    useFieldConfigStore.getState().setSection('labels', { scale: 2 });
    expect(fieldChunkBakeCacheKey(original)).not.toBe(originalKey);

    useFieldConfigStore.getState().reset();
    useFieldConfigStore.getState().setSection('activeCells', { sideSpan: 1 });
    expect(fieldChunkBakeCacheKey(original)).not.toBe(originalKey);

    useFieldConfigStore.getState().reset();
    useFieldConfigStore.getState().setSection('chunks', { cols: 9 });
    expect(fieldChunkBakeCacheKey(original)).not.toBe(originalKey);
  });

  it('evicts bakes outside the keep set', () => {
    bakeFieldChunk(request(0));
    bakeFieldChunk(request(3));
    evictFieldChunkBakes([3, 4]);
    expect(fieldChunkBakeCacheSize()).toBe(1);
    expect(peekFieldChunkBake(request(3))).not.toBeNull();
  });

  it('evicts stale visual variants even when the chunk index is retained', () => {
    const previous = request(2);
    const current = {
      ...previous,
      colors: { ...COLORS, fill: [30, 40, 50, 255] as const },
    };

    prepareFieldChunkTexture(previous);
    prepareFieldChunkTexture(current);
    expect(fieldChunkTexturePoolSize()).toBe(2);

    evictFieldChunkBakes([2], [fieldChunkBakeCacheKey(current)]);

    expect(fieldChunkTexturePoolSize()).toBe(1);
    expect(peekFieldChunkBake(previous)).toBeNull();
    expect(peekFieldChunkBake(current)).not.toBeNull();
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

  it('requeues pooled textures after a renderer context restore', () => {
    const req = request(2);
    const texture = prepareFieldChunkTexture(req);
    const firstRenderer = { initTexture: vi.fn() } as unknown as WebGLRenderer;
    pumpFieldChunkGpuUploads(firstRenderer, 1);
    expect(isFieldChunkGpuReady(req)).toBe(true);

    requeueFieldChunkGpuUploadsAfterContextRestore();

    expect(isFieldChunkGpuReady(req)).toBe(false);
    expect(pendingFieldChunkGpuUploads()).toBe(1);
    const restoredRenderer = { initTexture: vi.fn() } as unknown as WebGLRenderer;
    expect(pumpFieldChunkGpuUploads(restoredRenderer, 1)).toBe(1);
    expect(restoredRenderer.initTexture).toHaveBeenCalledWith(texture);
    expect(isFieldChunkGpuReady(req)).toBe(true);
  });

  it('uploads the chunk nearest the camera before older prefetch work', () => {
    const behind = prepareFieldChunkTexture(request(1));
    const focus = prepareFieldChunkTexture(request(3));
    const initTexture = vi.fn();
    const renderer = { initTexture } as unknown as WebGLRenderer;

    prioritizeFieldChunkGpuUploads([3, 1]);
    expect(pumpFieldChunkGpuUploads(renderer, 2)).toBe(2);
    expect(initTexture.mock.calls[0]?.[0]).toBe(focus);
    expect(initTexture.mock.calls[1]?.[0]).toBe(behind);
  });

  it('resolveMountedChunkIds waits for GPU-ready after bootstrap', () => {
    const ready = new Set([1, 2, 3]);
    const isReady = (id: number) => ready.has(id);

    expect(resolveMountedChunkIds([0, 1, 2, 3], [], isReady, true)).toEqual([0, 1, 2, 3]);
    expect(resolveMountedChunkIds([1, 2, 3, 4], [0, 1, 2, 3], isReady, false)).toEqual([
      1, 2, 3,
    ]);

    const readyWithoutIncomingEdge = new Set([0, 1, 2, 3]);
    expect(
      resolveMountedChunkIds(
        [1, 2, 3, 4],
        [0, 1, 2, 3],
        (id) => readyWithoutIncomingEdge.has(id),
        false,
      ),
    ).toEqual([0, 1, 2, 3]);

    expect(resolveMountedChunkIds([4, 5], [1, 2, 3], () => false, false)).toEqual([1, 2, 3]);
  });

  it('keeps mounted chunks visible while theme-specific textures upload again', () => {
    const mounted = [2, 3, 4, 5];
    const gpuReady = new Set([3]);

    // Applying a theme creates new GPU texture variants for all mounted chunks.
    // Uploading one variant must not hide every other visible chunk/tile.
    expect(
      resolveMountedChunkIds(mounted, mounted, (id) => gpuReady.has(id), false),
    ).toEqual(mounted);
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
