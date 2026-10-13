import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { queryKeys } from '@/infrastructure/query/queryKeys';

export function useCreateSurfaceObject() {
  const queryClient = useQueryClient();
  const { createSurfaceObject } = useUseCases();
  return useMutation({
    mutationFn: createSurfaceObject,
    onSuccess: (_object, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.surface(input.spaceId) }),
  });
}
