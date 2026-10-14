import type { SurfaceObjectStateDto } from '@/shared/contracts';
import { parsePixelObjectMobileDto } from '@/shared/contracts/parsePixelObjectMobile';
import { ValidationError } from '@/shared/errors';
import { catalogAssetUrl } from '@/shared/utils/catalogAssetUrl';
import type { SurfaceMomentStats } from '../../domain/entities/SurfaceMomentStats';
import type { SurfaceObject } from '../../domain/entities/SurfaceObject';
import type { SurfaceBounds, SurfaceSnapshot } from '../../domain/entities/SurfaceSnapshot';
import { spaceId } from '../../domain/value-objects/SpaceId';

const SURFACE_STATES = new Set<SurfaceObjectStateDto>(['Emerging', 'Active', 'Fading', 'Settled']);

export function parseSurfaceSnapshot(raw: unknown, baseUrl: string): SurfaceSnapshot {
  if (!isRecord(raw) || !isRecord(raw.surface) || !Array.isArray(raw.objects)) {
    throw new ValidationError('Снимок поверхности пришёл в неожиданном виде');
  }
  const surface = raw.surface;
  if (!isNonEmptyString(surface.id) || !isNonEmptyString(surface.spaceId)) {
    throw new ValidationError('В снимке поверхности отсутствует идентификатор');
  }
  const bounds = parseBounds(surface.bounds);
  if (bounds === undefined || !isNonNegativeInt(surface.version)) {
    throw new ValidationError('Параметры поверхности повреждены');
  }
  const objects = raw.objects.map((value) => parseObject(value, baseUrl));
  if (objects.some((value) => value === null)) {
    throw new ValidationError('В снимке поверхности есть некорректный объект');
  }
  return {
    id: surface.id,
    spaceId: spaceId(surface.spaceId),
    bounds,
    version: surface.version,
    objects: objects as SurfaceObject[],
  };
}

export function parseSurfaceObject(raw: unknown, baseUrl: string): SurfaceObject {
  const object = parseObject(raw, baseUrl);
  if (object === null) throw new ValidationError('Объект поверхности пришёл в неожиданном виде');
  return object;
}

export function parseSurfaceMomentStats(raw: unknown): SurfaceMomentStats {
  if (
    !isRecord(raw) ||
    !isNonNegativeInt(raw.total) ||
    !isNonNegativeInt(raw.good) ||
    !isNonNegativeInt(raw.bad) ||
    raw.good + raw.bad > raw.total
  ) {
    throw new ValidationError('Сводка моментов пришла в неожиданном виде');
  }
  return { total: raw.total, good: raw.good, bad: raw.bad };
}

function parseObject(raw: unknown, baseUrl: string): SurfaceObject | null {
  if (!isRecord(raw)) return null;
  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.spaceId) ||
    !isNonEmptyString(raw.surfaceId) ||
    !isNonEmptyString(raw.kind) ||
    !isNonNegativeInt(raw.cellX) ||
    !isNonNegativeInt(raw.cellY) ||
    !isNonEmptyString(raw.createdAt) ||
    !isPositiveInt(raw.version) ||
    !SURFACE_STATES.has(raw.state as SurfaceObjectStateDto)
  ) {
    return null;
  }
  const createdAt = new Date(raw.createdAt);
  if (!Number.isFinite(createdAt.getTime())) return null;
  const pixelObjectId = typeof raw.pixelObjectId === 'string' ? raw.pixelObjectId : null;
  return {
    id: raw.id,
    spaceId: spaceId(raw.spaceId),
    surfaceId: raw.surfaceId,
    cell: { x: raw.cellX, y: raw.cellY },
    kind: raw.kind,
    state: raw.state as SurfaceObjectStateDto,
    pixelObjectId,
    pixelObject: parsePixelObject(raw.pixelObject, baseUrl),
    createdAt,
    version: raw.version,
  };
}

function parsePixelObject(raw: unknown, baseUrl: string) {
  const parsed = parsePixelObjectMobileDto(raw);
  if (parsed === null) return null;
  const sheetUrl = catalogAssetUrl(baseUrl, parsed.sheetUrl);
  if (sheetUrl === null) return null;
  const previewUrl = catalogAssetUrl(baseUrl, parsed.previewUrl);
  return {
    ...parsed,
    sheetUrl,
    ...(parsed.previewUrl === undefined ? {} : { previewUrl }),
  };
}

function parseBounds(raw: unknown): SurfaceBounds | null | undefined {
  if (raw === null) return null;
  if (!isRecord(raw)) return undefined;
  if (
    !isInteger(raw.minX) ||
    !isInteger(raw.maxX) ||
    !isInteger(raw.minY) ||
    !isInteger(raw.maxY)
  ) {
    return undefined;
  }
  return { minX: raw.minX, maxX: raw.maxX, minY: raw.minY, maxY: raw.maxY };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return isInteger(value) && value > 0;
}
