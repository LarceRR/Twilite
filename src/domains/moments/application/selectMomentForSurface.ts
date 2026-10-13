import type { CreateSurfaceObjectInput } from '@/domains/spaces/domain/repositories/SurfaceRepository';
import type { MomentKind } from '../domain/entities/MomentCatalog';

export function selectMomentForSurface(input: {
  readonly spaceId: CreateSurfaceObjectInput['spaceId'];
  readonly kind: MomentKind;
  readonly momentId: string;
  readonly idempotencyKey: string;
}): CreateSurfaceObjectInput {
  return {
    spaceId: input.spaceId,
    kind: input.kind === 'good' ? 'Fire' : 'Cloud',
    pixelObjectId: input.momentId,
    idempotencyKey: input.idempotencyKey,
  };
}
