import { useMemo } from 'react';

import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import type { PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { readPixelObjectId } from '@/shared/pixelObject/metadata';

export type FieldSpritePlacement = {
  readonly surfaceObjectId: string;
  readonly cell: { readonly x: number; readonly y: number };
  readonly dto: PixelObjectMobileDto;
};

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
      const pixelObjectId = readPixelObjectId(object.metadata);
      if (pixelObjectId === null) {
        return [];
      }
      const dto = mobileById[pixelObjectId];
      if (dto === undefined) {
        return [];
      }
      return [{ surfaceObjectId: id, cell: object.cell, dto }];
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
