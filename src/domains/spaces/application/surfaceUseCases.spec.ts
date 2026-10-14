import { describe, expect, it, vi } from 'vitest';

import type { SurfaceObject } from '../domain/entities/SurfaceObject';
import type { SurfaceSnapshot } from '../domain/entities/SurfaceSnapshot';
import type { SurfaceRepository } from '../domain/repositories/SurfaceRepository';
import type { SpaceId } from '../domain/value-objects/SpaceId';
import {
  clearSurfaceMomentsUseCase,
  createSurfaceObjectUseCase,
  getSurfaceMomentStatsUseCase,
  getSurfaceSnapshotUseCase,
} from './surfaceUseCases';

const spaceId = 'space-1' as SpaceId;
const snapshot: SurfaceSnapshot = {
  id: 'surface-1',
  spaceId,
  bounds: null,
  version: 1,
  objects: [],
};
const object: SurfaceObject = {
  id: 'object-1',
  spaceId,
  surfaceId: 'surface-1',
  cell: { x: 2, y: 7 },
  kind: 'Fire',
  state: 'Emerging',
  pixelObjectId: 'pixel-1',
  pixelObject: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  version: 1,
};

describe('surfaceUseCases', () => {
  it('loads a snapshot through the repository', async () => {
    const getSnapshot = vi.fn(async () => snapshot);
    const repository = { getSnapshot } as unknown as SurfaceRepository;

    await expect(getSurfaceSnapshotUseCase(repository)(spaceId)).resolves.toBe(snapshot);
    expect(getSnapshot).toHaveBeenCalledWith(spaceId);
  });

  it('creates an object with the client idempotency key', async () => {
    const input = {
      spaceId,
      kind: 'Fire' as const,
      pixelObjectId: 'pixel-1',
      idempotencyKey: 'operation-1',
    };
    const createObject = vi.fn(async () => object);
    const repository = { createObject } as unknown as SurfaceRepository;

    await expect(createSurfaceObjectUseCase(repository)(input)).resolves.toBe(object);
    expect(createObject).toHaveBeenCalledWith(input);
  });

  it('loads aggregate counts and clears space moments through the repository', async () => {
    const stats = { total: 4, good: 2, bad: 1 };
    const getMomentStats = vi.fn(async () => stats);
    const clearMoments = vi.fn(async () => undefined);
    const repository = { getMomentStats, clearMoments } as unknown as SurfaceRepository;

    await expect(getSurfaceMomentStatsUseCase(repository)(spaceId)).resolves.toBe(stats);
    await expect(clearSurfaceMomentsUseCase(repository)(spaceId)).resolves.toBeUndefined();
    expect(getMomentStats).toHaveBeenCalledWith(spaceId);
    expect(clearMoments).toHaveBeenCalledWith(spaceId);
  });
});
