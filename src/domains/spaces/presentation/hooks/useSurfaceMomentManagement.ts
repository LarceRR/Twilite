import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { queryKeys } from '@/infrastructure/query/queryKeys';

import type { SpaceId } from '../../domain/value-objects/SpaceId';

export function useSurfaceMomentStats(spaceId: SpaceId) {
  const { getSurfaceMomentStats } = useUseCases();
  return useQuery({
    queryKey: queryKeys.surfaceMomentStats(spaceId),
    queryFn: () => getSurfaceMomentStats(spaceId),
  });
}

export function useClearSurfaceMoments(spaceId: SpaceId) {
  const queryClient = useQueryClient();
  const { clearSurfaceMoments } = useUseCases();
  return useMutation({
    mutationFn: () => clearSurfaceMoments(spaceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.surface(spaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.surfaceMomentStats(spaceId) }),
      ]);
    },
  });
}
