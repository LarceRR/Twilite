import { useMemo } from 'react';

import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import type { PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { readPixelObjectId } from '@/shared/pixelObject/metadata';

import { SPRITE_PLACEHOLDER_MOBILE } from './spritePlaceholder';

export type FieldSpritePlacement = {
  readonly surfaceObjectId: string;
  readonly cell: { readonly x: number; readonly y: number };
  readonly dto: PixelObjectMobileDto;
  readonly placeholder: boolean;
};

function resolveBindingId(object: {
  readonly pixelObjectId?: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}): string | null {
  if (typeof object.pixelObjectId === 'string' && object.pixelObjectId.length > 0) {
    return object.pixelObjectId;
  }
  return readPixelObjectId(object.metadata);
}

export function useFieldSpritePlacements(
  mobileById: Readonly<Record<string, PixelObjectMobileDto | undefined>>,
): readonly FieldSpritePlacement[] {
  const order = useSurfaceObjectsStore((state) => state.order);
  const byId = useSurfaceObjectsStore((state) => state.byId);

  return useMemo(() => {
    return order.flatMap((id) => {
      const object = byId[id];
      if (object === undefined) {
        return [];
      }
      const kind = object.kind;
      if (kind !== 'Fire' && kind !== 'Cloud') {
        return [];
      }
      const pixelObjectId = resolveBindingId(object);
      if (pixelObjectId === null) {
        return [
          {
            surfaceObjectId: id,
            cell: object.cell,
            dto: SPRITE_PLACEHOLDER_MOBILE,
            placeholder: true,
          },
        ];
      }
      const dto = mobileById[pixelObjectId];
      if (dto === undefined || dto.sheetUrl.length === 0) {
        return [
          {
            surfaceObjectId: id,
            cell: object.cell,
            dto: SPRITE_PLACEHOLDER_MOBILE,
            placeholder: true,
          },
        ];
      }
      return [{ surfaceObjectId: id, cell: object.cell, dto, placeholder: false }];
    });
  }, [byId, mobileById, order]);
}

export function useFieldMaxRow(): number {
  const order = useSurfaceObjectsStore((state) => state.order);
  const byId = useSurfaceObjectsStore((state) => state.byId);

  return useMemo(() => {
    let max = 0;
    for (const id of order) {
      const object = byId[id];
      if (object !== undefined && object.cell.y > max) {
        max = object.cell.y;
      }
    }
    return max;
  }, [byId, order]);
}

