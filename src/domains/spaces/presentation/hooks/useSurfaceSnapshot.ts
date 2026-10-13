import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useServices, useUseCases } from '@/app/providers/ContainerProvider';
import { queryKeys } from '@/infrastructure/query/queryKeys';

import type { SpaceId } from '../../domain/value-objects/SpaceId';

export function useSurfaceSnapshot(spaceId: SpaceId | null) {
  const queryClient = useQueryClient();
  const { realtime } = useServices();
  const { getSurfaceSnapshot } = useUseCases();
  useEffect(() => {
    if (spaceId === null || realtime === null) return;
    realtime.connect(spaceId, ['scene']);
    return () => realtime.disconnect();
  }, [realtime, spaceId]);

  useEffect(() => {
    if (spaceId === null || realtime === null) return;
    const invalidate = (): void => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.surface(spaceId) });
    };
    const unsubscribeMessage = realtime.onMessage((message) => {
      if (
        'spaceId' in message &&
        message.spaceId === spaceId &&
        message.type.startsWith('surfaceObject.')
      ) {
        invalidate();
      }
    });
    const unsubscribeStatus = realtime.onStatus((status) => {
      if (status === 'open') invalidate();
    });
    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
    };
  }, [queryClient, realtime, spaceId]);

  return useQuery({
    queryKey: spaceId === null ? ['surface', 'disabled'] : queryKeys.surface(spaceId),
    queryFn: () => {
      if (spaceId === null) throw new Error('Пространство не выбрано');
      return getSurfaceSnapshot(spaceId);
    },
    enabled: spaceId !== null,
    staleTime: 15_000,
  });
}
