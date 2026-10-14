import type { UseCase } from '@/shared/application/UseCase';
import type { SurfaceMomentStats } from '../domain/entities/SurfaceMomentStats';
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

export function getSurfaceMomentStatsUseCase(
  repository: SurfaceRepository,
): UseCase<SpaceId, SurfaceMomentStats> {
  return (spaceId) => repository.getMomentStats(spaceId);
}

export function clearSurfaceMomentsUseCase(repository: SurfaceRepository): UseCase<SpaceId, void> {
  return (spaceId) => repository.clearMoments(spaceId);
}

export function createSurfaceObjectUseCase(
  repository: SurfaceRepository,
): UseCase<CreateSurfaceObjectInput, SurfaceObject> {
  return (input) => repository.createObject(input);
}
