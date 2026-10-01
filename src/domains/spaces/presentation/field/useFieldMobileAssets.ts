import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import type { PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { readPixelObjectId } from '@/shared/pixelObject/metadata';

export function useFieldMobileAssets(): Readonly<Record<string, PixelObjectMobileDto | undefined>> {
  const { getPixelObjectMobile } = useUseCases();
  const order = useSurfaceObjectsStore((state) => state.order);
  const byId = useSurfaceObjectsStore((state) => state.byId);

  const pixelObjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of order) {
      const object = byId[id];
      if (object === undefined) {
        continue;
      }
      const pixelObjectId = readPixelObjectId(object.metadata);
      if (pixelObjectId !== null) {
        ids.add(pixelObjectId);
      }
    }
    return [...ids];
  }, [byId, order]);

  const queries = useQueries({
    queries: pixelObjectIds.map((id) => ({
      queryKey: ['pixel-objects', 'mobile', id],
      queryFn: () => getPixelObjectMobile(id),
      staleTime: Number.POSITIVE_INFINITY,
      retry: 2,
    })),
  });

  return useMemo(() => {
    const map: Record<string, PixelObjectMobileDto> = {};
    for (let index = 0; index < pixelObjectIds.length; index += 1) {
      const id = pixelObjectIds[index];
      const data = queries[index]?.data;
      if (id !== undefined && data !== undefined) {
        map[id] = data;
      }
    }
    return map;
  }, [pixelObjectIds, queries]);
}
