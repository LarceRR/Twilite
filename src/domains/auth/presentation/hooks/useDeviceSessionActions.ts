import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useServices, useUseCases } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { queryKeys } from '@/infrastructure/query/queryKeys';
import { toAppError } from '@/shared/errors';

import { useAuthStore } from '../stores/authStore';

export type DeviceSessionActions = {
  readonly revokeSession: (sessionId: string, options?: { readonly current?: boolean }) => Promise<void>;
  readonly revokeAll: () => Promise<void>;
  readonly isPending: boolean;
};

export function useDeviceSessionActions(): DeviceSessionActions {
  const useCases = useUseCases();
  const { sessions } = useServices();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const setSession = useAuthStore((state) => state.setSession);

  /**
   * Drop local credentials only. Navigation to sign-in comes from the auth gate
   * once status flips to anonymous — never from this hook.
   */
  const clearLocalSession = useCallback(() => {
    sessions.adopt(null);
    setSession(null);
    queryClient.clear();
  }, [queryClient, sessions, setSession]);

  const revokeOne = useMutation({
    mutationFn: (input: { readonly sessionId: string; readonly current: boolean }) =>
      useCases
        .revokeDeviceSession({ sessionId: input.sessionId, clearLocal: input.current })
        .then(() => input),
    onSuccess: (input) => {
      if (input.current) {
        clearLocalSession();
        showToast('Вы вышли из этой сессии', 'neutral');
        return;
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      showToast('Сессия завершена', 'positive');
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  const revokeAll = useMutation({
    mutationFn: () => useCases.revokeAllDeviceSessions(),
    onSuccess: () => {
      clearLocalSession();
      showToast('Вы вышли на всех устройствах', 'neutral');
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  return {
    revokeSession: useCallback(
      async (sessionId, options) => {
        await revokeOne.mutateAsync({ sessionId, current: options?.current === true });
      },
      [revokeOne],
    ),
    revokeAll: useCallback(async () => {
      await revokeAll.mutateAsync();
    }, [revokeAll]),
    isPending: revokeOne.isPending || revokeAll.isPending,
  };
}
