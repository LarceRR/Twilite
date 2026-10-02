import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { cacheConfig } from '@/app/config/constants';
import { useUseCases } from '@/app/providers/ContainerProvider';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { queryKeys } from '@/infrastructure/query/queryKeys';

import type { Space } from '../../domain/entities/Space';
import { useSpaceStore } from '../stores/spaceStore';

export type SpacesView = {
  readonly spaces: readonly Space[];
  readonly activeSpace: Space | null;
  readonly isLoading: boolean;
  readonly error: unknown;
};

const NO_SPACES: readonly Space[] = [];

/** Loads the user's spaces and keeps the active-space selection in sync. */
export function useSpaces(): SpacesView {
  const { listSpaces } = useUseCases();
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const setSpaces = useSpaceStore((state) => state.setSpaces);
  const activeSpaceId = useSpaceStore((state) => state.activeSpaceId);

  const query = useQuery({
    queryKey: queryKeys.spaces(),
    queryFn: () => listSpaces(),
    enabled: isAuthenticated,
    staleTime: cacheConfig.activeSpaceTtlMs,
  });

  const spaces = query.data ?? NO_SPACES;

  useEffect(() => {
    if (query.data !== undefined) {
      setSpaces(query.data);
    }
  }, [query.data, setSpaces]);

  // Derived in render, not read back from the store: the store only learns about
  // the list in the effect above, which used to leave one frame with
  // `activeSpace === null` and flash the "no space" empty state.
  const activeSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? spaces[0] ?? null,
    [spaces, activeSpaceId],
  );

  return {
    spaces,
    activeSpace,
    isLoading: query.isLoading,
    error: query.error,
  };
}
