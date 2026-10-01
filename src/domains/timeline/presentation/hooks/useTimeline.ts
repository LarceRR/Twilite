import { useInfiniteQuery } from '@tanstack/react-query';

import { cacheConfig } from '@/app/config/constants';
import { useUseCases } from '@/app/providers/ContainerProvider';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { queryKeys } from '@/infrastructure/query/queryKeys';
import { ValidationError } from '@/shared/errors';

import type { TimelineEvent } from '../../domain/entities/TimelineEvent';
import { timelineNextPageParam } from './timelineNextPageParam';

export type TimelineView = {
  readonly events: readonly TimelineEvent[];
  readonly isLoading: boolean;
  readonly hasMore: boolean;
  readonly loadMore: () => void;
  readonly isLoadingMore: boolean;
  readonly error: unknown;
};

export function useTimeline(spaceId: SpaceId | null): TimelineView {
  const { getTimeline } = useUseCases();

  const query = useInfiniteQuery({
    queryKey: spaceId === null ? ['timeline', 'none'] : queryKeys.timeline(spaceId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      if (spaceId === null) {
        throw new ValidationError('Пространство не выбрано');
      }

      return getTimeline({ spaceId, cursor: pageParam });
    },
    getNextPageParam: (lastPage) => timelineNextPageParam(lastPage.nextCursor),
    enabled: spaceId !== null,
    staleTime: cacheConfig.timelineStaleMs,
  });

  const events = query.data?.pages.flatMap((page) => page.events) ?? [];

  return {
    events,
    isLoading: query.isLoading,
    hasMore: query.hasNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
    isLoadingMore: query.isFetchingNextPage,
    error: query.error,
  };
}
