import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import type { PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';
import { parsePixelObjectMobileDto } from '@/shared/contracts/parsePixelObjectMobile';
import { readPixelObjectId } from '@/shared/pixelObject/metadata';

type FetchTarget = {
  readonly id: string;
  readonly revision: number | null;
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

/**
 * Prefer embedded mobile DTOs from snapshot/realtime; fetch `/mobile` only for legacy
 * rows without embed (P4-S2). Query key includes revision.
 */
export function useFieldMobileAssets(): Readonly<Record<string, PixelObjectMobileDto | undefined>> {
  const { getPixelObjectMobile } = useUseCases();
  const order = useSurfaceObjectsStore((state) => state.order);
  const byId = useSurfaceObjectsStore((state) => state.byId);

  const embedded = useMemo(() => {
    const map: Record<string, PixelObjectMobileDto> = {};
    for (const id of order) {
      const object = byId[id];
      if (object === undefined) continue;
      const pixelObjectId = resolveBindingId(object);
      if (pixelObjectId === null) continue;
      const raw = object.pixelObject;
      if (raw == null) continue;
      const parsed = parsePixelObjectMobileDto(raw);
      if (parsed !== null) {
        map[pixelObjectId] = parsed;
      }
    }
    return map;
  }, [byId, order]);

  const fetchTargets = useMemo(() => {
    const targets: FetchTarget[] = [];
    const seen = new Set<string>();
    for (const id of order) {
      const object = byId[id];
      if (object === undefined) continue;
      const pixelObjectId = resolveBindingId(object);
      if (pixelObjectId === null || embedded[pixelObjectId] !== undefined) continue;
      if (seen.has(pixelObjectId)) continue;
      seen.add(pixelObjectId);
      targets.push({
        id: pixelObjectId,
        revision:
          typeof object.pixelObject?.revision === 'number'
            ? object.pixelObject.revision
            : null,
      });
    }
    return targets;
  }, [byId, embedded, order]);

  const queries = useQueries({
    queries: fetchTargets.map((target) => ({
      queryKey: ['pixel-objects', 'mobile', target.id, target.revision ?? 0],
      queryFn: async () => {
        const raw = await getPixelObjectMobile(target.id);
        const parsed = parsePixelObjectMobileDto(raw);
        if (parsed === null) {
          throw new Error('invalid_mobile_dto');
        }
        return parsed;
      },
      staleTime: 60_000,
      retry: 2,
    })),
  });

  return useMemo(() => {
    const map: Record<string, PixelObjectMobileDto> = { ...embedded };
    for (let index = 0; index < fetchTargets.length; index += 1) {
      const target = fetchTargets[index];
      const data = queries[index]?.data;
      if (target !== undefined && data !== undefined) {
        map[target.id] = data;
      }
    }
    return map;
  }, [embedded, fetchTargets, queries]);
}
