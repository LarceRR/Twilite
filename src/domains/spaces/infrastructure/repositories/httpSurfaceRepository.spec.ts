import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@/infrastructure/http/httpClient';
import type { SpaceId } from '../../domain/value-objects/SpaceId';

import { createHttpSurfaceRepository } from './httpSurfaceRepository';

const spaceId = 'space-1' as SpaceId;
const object = {
  id: 'object-1',
  spaceId,
  surfaceId: 'surface-1',
  cellX: 2,
  cellY: 7,
  kind: 'Fire',
  state: 'Emerging',
  createdAt: '2026-10-13T12:00:00.000Z',
  version: 1,
  pixelObjectId: null,
  pixelObject: null,
};

describe('createHttpSurfaceRepository', () => {
  it('reads a snapshot through the space surface endpoint', async () => {
    const get = vi.fn(async () => ({
      surface: { id: 'surface-1', spaceId, bounds: null, version: 1 },
      objects: [],
    }));
    const repository = createHttpSurfaceRepository(
      { get } as unknown as HttpClient,
      'https://api.test/v1',
    );

    const result = await repository.getSnapshot(spaceId);

    expect(get).toHaveBeenCalledWith(`spaces/${spaceId}/surface`);
    expect(result.objects).toEqual([]);
  });

  it('posts only catalog identity and never sends a cell coordinate', async () => {
    const post = vi.fn(async () => object);
    const repository = createHttpSurfaceRepository(
      { post } as unknown as HttpClient,
      'https://api.test/v1',
    );
    const input = {
      spaceId,
      kind: 'Fire' as const,
      pixelObjectId: 'pixel-1',
      idempotencyKey: 'surface_operation-1',
    };

    const result = await repository.createObject(input);

    expect(result.cell).toEqual({ x: 2, y: 7 });
    expect(post).toHaveBeenCalledWith(
      `spaces/${spaceId}/surface-objects`,
      { kind: 'Fire', pixelObjectId: 'pixel-1' },
      { idempotencyKey: 'surface_operation-1' },
    );
  });
});
