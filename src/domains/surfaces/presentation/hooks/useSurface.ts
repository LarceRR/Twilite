import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { cacheConfig } from '@/app/config/constants';
import { useUseCases } from '@/app/providers/ContainerProvider';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { queryKeys } from '@/infrastructure/query/queryKeys';
import { ValidationError } from '@/shared/errors';

import type { Surface } from '../../domain/entities/Surface';

export type SurfaceView = {
  readonly surface: Surface | null;
  readonly isLoading: boolean;
  readonly error: unknown;
};

/**
 * Owns the surface snapshot. The object list is pushed into the scene store so
 * the frame loop can read it without a React subscription.
 *
 * The store is the live view (snapshot + realtime + mutations); the query is
 * only the authoritative resync. Each snapshot is tagged with its space and
 * `dataUpdatedAt`, so a cached snapshot re-delivered on remount can't erase
 * objects that arrived later, and switching space never shows the previous
 * space's objects while the new snapshot is loading.
 */
export function useSurface(spaceId: SpaceId | null): SurfaceView {
  const { getSurfaceSnapshot } = useUseCases();

  const query = useQuery({
    queryKey: spaceId === null ? ['surface', 'none'] : queryKeys.surface(spaceId),
    queryFn: () => {
      if (spaceId === null) {
        throw new ValidationError('Пространство не выбрано');
      }

      return getSurfaceSnapshot(spaceId);
    },
    enabled: spaceId !== null,
    staleTime: cacheConfig.surfaceStaleMs,
  });

  const objects = query.data?.objects;
  const syncedAt = query.dataUpdatedAt;

  useEffect(() => {
    const store = useSurfaceObjectsStore.getState();

    if (spaceId === null) {
      store.clear();
      return;
    }

    if (objects === undefined) {
      if (store.spaceId !== null && store.spaceId !== spaceId) {
        store.clear();
      }
      return;
    }

    store.replaceAll(objects, { spaceId, syncedAt });
  }, [objects, spaceId, syncedAt]);

  return {
    surface: query.data?.surface ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
