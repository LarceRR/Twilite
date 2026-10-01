import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { queryKeys } from '@/infrastructure/query/queryKeys';
import { toAppError } from '@/shared/errors';

import type { QrLoginPreview } from '../../domain/entities/QrLoginPreview';

export type QrLoginActions = {
  readonly inspect: (token: string) => Promise<QrLoginPreview>;
  readonly approve: (token: string) => Promise<void>;
  readonly deny: (token: string) => Promise<void>;
  readonly isPending: boolean;
};

export function useQrLoginActions(): QrLoginActions {
  const useCases = useUseCases();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);

  const inspectMutation = useMutation({
    mutationFn: (token: string) => useCases.inspectQrLogin(token),
  });

  const approveMutation = useMutation({
    mutationFn: (token: string) => useCases.approveQrLogin(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  const denyMutation = useMutation({
    mutationFn: (token: string) => useCases.denyQrLogin(token),
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  return {
    inspect: useCallback((token) => inspectMutation.mutateAsync(token), [inspectMutation]),
    approve: useCallback((token) => approveMutation.mutateAsync(token), [approveMutation]),
    deny: useCallback((token) => denyMutation.mutateAsync(token), [denyMutation]),
    isPending: inspectMutation.isPending || approveMutation.isPending || denyMutation.isPending,
  };
}
