import type { UseCase } from '@/shared/application/UseCase';

import type { SurfaceObject } from '../domain/entities/SurfaceObject';
import type { SurfaceSnapshot } from '../domain/entities/SurfaceSnapshot';
import type {
  CreateSurfaceObjectInput,
  SurfaceRepository,
} from '../domain/repositories/SurfaceRepository';
import type { SpaceId } from '../domain/value-objects/SpaceId';

export function getSurfaceSnapshotUseCase(
  repository: SurfaceRepository,
): UseCase<SpaceId, SurfaceSnapshot> {
  return (spaceId) => repository.getSnapshot(spaceId);
}

export function createSurfaceObjectUseCase(
  repository: SurfaceRepository,
): UseCase<CreateSurfaceObjectInput, SurfaceObject> {
  return (input) => repository.createObject(input);
}
