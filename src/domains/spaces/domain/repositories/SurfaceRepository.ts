import type { SurfaceObjectKindDto } from '@/shared/contracts';

import type { SurfaceObject } from '../entities/SurfaceObject';
import type { SurfaceSnapshot } from '../entities/SurfaceSnapshot';
import type { SpaceId } from '../value-objects/SpaceId';

export type CreateSurfaceObjectInput = {
  readonly spaceId: SpaceId;
  readonly kind: SurfaceObjectKindDto;
  readonly pixelObjectId: string;
  readonly idempotencyKey: string;
};

export interface SurfaceRepository {
  getSnapshot(spaceId: SpaceId): Promise<SurfaceSnapshot>;
  createObject(input: CreateSurfaceObjectInput): Promise<SurfaceObject>;
}

export const SURFACE_REPOSITORY = Symbol('SURFACE_REPOSITORY');
