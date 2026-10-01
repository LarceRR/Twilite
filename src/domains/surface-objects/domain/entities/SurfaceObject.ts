import type { UserId } from '@/domains/auth/domain/value-objects/UserId';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import type { SurfaceId } from '@/domains/surfaces/domain/value-objects/SurfaceId';
import type { PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { DomainError } from '@/shared/errors';

import type { Cell } from '../value-objects/Cell';
import type { SurfaceObjectId } from '../value-objects/SurfaceObjectId';
import type { SurfaceObjectKind } from '../value-objects/SurfaceObjectKind';
import {
  canApplyTransition,
  type SurfaceObjectState,
  type SurfaceObjectTransition,
  transitionTarget,
} from '../value-objects/SurfaceObjectState';

export type SurfaceObjectMetadata = Readonly<Record<string, unknown>>;

/**
 * The universal object living in one surface cell. There is deliberately no
 * `Fire` or `Cloud` entity — `kind` carries that meaning.
 */
export type SurfaceObject = {
  readonly id: SurfaceObjectId;
  readonly spaceId: SpaceId;
  readonly surfaceId: SurfaceId;
  readonly cell: Cell;
  readonly kind: SurfaceObjectKind;
  readonly state: SurfaceObjectState;
  /** Who noticed the action and placed the object. */
  readonly createdByUserId: UserId;
  /** Whose action the object is about. */
  readonly subjectUserId: UserId;
  readonly metadata: SurfaceObjectMetadata;
  /** First-class binding; optional during dual-read (P4-S2). */
  readonly pixelObjectId?: string | null;
  /** Embedded mobile DTO from snapshot/realtime when present. */
  readonly pixelObject?: PixelObjectMobileDto | null;
  readonly favorite: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly version: number;
};

export function applyTransition(
  object: SurfaceObject,
  transition: SurfaceObjectTransition,
  at: number,
): SurfaceObject {
  if (!canApplyTransition(object.state, transition)) {
    throw new DomainError('Недопустимый переход состояния объекта', {
      context: { id: object.id, state: object.state, transition },
    });
  }

  return {
    ...object,
    state: transitionTarget(transition),
    updatedAt: at,
    version: object.version + 1,
  };
}

export function withFavorite(object: SurfaceObject, favorite: boolean, at: number): SurfaceObject {
  if (object.favorite === favorite) {
    return object;
  }

  return { ...object, favorite, updatedAt: at, version: object.version + 1 };
}

export function withMetadata(
  object: SurfaceObject,
  metadata: SurfaceObjectMetadata,
  at: number,
): SurfaceObject {
  return {
    ...object,
    metadata: { ...object.metadata, ...metadata },
    updatedAt: at,
    version: object.version + 1,
  };
}

/** Objects that still animate; drives the particle and emissive budget. */
export function isAnimated(object: SurfaceObject): boolean {
  return object.state === 'Emerging' || object.state === 'Active';
}
