import { userId } from '@/domains/auth/domain/value-objects/UserId';
import { spaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { surfaceId } from '@/domains/surfaces/domain/value-objects/SurfaceId';
import type { SurfaceObjectDto } from '@/shared/contracts';
import { ValidationError } from '@/shared/errors';
import type { SurfaceObject } from '../../domain/entities/SurfaceObject';
import { cell } from '../../domain/value-objects/Cell';
import { surfaceObjectId } from '../../domain/value-objects/SurfaceObjectId';
import { isSurfaceObjectState } from '../../domain/value-objects/SurfaceObjectState';
export function toSurfaceObject(dto: SurfaceObjectDto): SurfaceObject {
  if (!isSurfaceObjectState(dto.state))
    throw new ValidationError('Неизвестное состояние объекта', {
      state: [`Получено «${dto.state}»`],
    });
  if (!Number.isFinite(dto.version) || dto.version < 0)
    throw new ValidationError('Некорректная версия объекта', {
      version: ['Ожидалось неотрицательное число'],
    });
  const createdAt = Date.parse(dto.createdAt),
    updatedAt = Date.parse(dto.updatedAt);
  return {
    id: surfaceObjectId(dto.id),
    spaceId: spaceId(dto.spaceId),
    surfaceId: surfaceId(dto.surfaceId),
    cell: cell(dto.cellX, dto.cellY),
    kind: dto.kind,
    state: dto.state,
    createdByUserId: userId(dto.createdByUserId),
    subjectUserId: userId(dto.subjectUserId),
    metadata: dto.metadata,
    pixelObjectId: dto.pixelObjectId ?? null,
    pixelObject: dto.pixelObject ?? null,
    favorite: dto.favorite,
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt,
    updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
    version: dto.version,
  };
}
export function toSurfaceObjectDto(entity: SurfaceObject): SurfaceObjectDto {
  return {
    id: entity.id,
    spaceId: entity.spaceId,
    surfaceId: entity.surfaceId,
    cellX: entity.cell.x,
    cellY: entity.cell.y,
    kind: entity.kind,
    state: entity.state,
    createdByUserId: entity.createdByUserId,
    subjectUserId: entity.subjectUserId,
    metadata: entity.metadata,
    pixelObjectId: entity.pixelObjectId ?? null,
    pixelObject: entity.pixelObject ?? null,
    favorite: entity.favorite,
    createdAt: new Date(entity.createdAt).toISOString(),
    updatedAt: new Date(entity.updatedAt).toISOString(),
    version: entity.version,
  };
}
