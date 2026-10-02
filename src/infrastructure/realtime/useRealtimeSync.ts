import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useServices } from '@/app/providers/ContainerProvider';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { surfaceObjectId } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectId';
import { toSurfaceObject } from '@/domains/surface-objects/infrastructure/mappers/surfaceObjectMapper';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { queryKeys } from '@/infrastructure/query/queryKeys';

import { useRealtimeStore } from './realtimeStore';
import { createQueryInvalidateScheduler } from './scheduleQueryInvalidate';

const SUBSCRIBED_CHANNELS = ['scene', 'timeline', 'notifications', 'presence'] as const;
/** Collapse create+activate (and duplicate sockets) into one timeline refetch. */
const TIMELINE_INVALIDATE_DEBOUNCE_MS = 400;

/** Subscribes the active space and applies gateway events; HTTP remains authoritative. */
export function useRealtimeSync(spaceId: SpaceId | null): void {
  const { realtime, logger } = useServices();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (realtime === null || spaceId === null) {
      return;
    }

    const store = useSurfaceObjectsStore.getState();
    const realtimeStore = useRealtimeStore.getState();
    const timelineInvalidate = createQueryInvalidateScheduler(TIMELINE_INVALIDATE_DEBOUNCE_MS);

    const unsubscribeStatus = realtime.onStatus((status) => {
      useRealtimeStore.getState().setStatus(status);
    });

    const unsubscribeMessages = realtime.onMessage((message) => {
      if ('spaceId' in message && message.spaceId !== spaceId) {
        return;
      }

      try {
        switch (message.type) {
          case 'surfaceObject.created':
          case 'surfaceObject.updated':
            store.upsert(toSurfaceObject(message.object));
            break;
          case 'surfaceObject.deleted':
            store.remove(surfaceObjectId(message.objectId));
            break;
          case 'timeline.appended':
            timelineInvalidate.schedule(() => {
              void queryClient.invalidateQueries({ queryKey: queryKeys.timeline(spaceId) });
            });
            break;
          case 'presence.changed':
            realtimeStore.setPresence(message.userIds);
            break;
          case 'subscribed':
            // Events emitted between the HTTP snapshot and this (re)subscription
            // were never delivered; one resync closes that gap, including after
            // a reconnect from background.
            void queryClient.invalidateQueries({ queryKey: queryKeys.surface(spaceId) });
            break;
          case 'pong':
          case 'error':
            break;
          default:
            break;
        }
      } catch (error) {
        logger.warn('Не удалось применить realtime-событие', { error: String(error) });
      }
    });

    realtime.connect(spaceId, SUBSCRIBED_CHANNELS);

    return () => {
      timelineInvalidate.cancel();
      unsubscribeMessages();
      unsubscribeStatus();
      realtime.disconnect();
    };
  }, [realtime, spaceId, queryClient, logger]);
}
