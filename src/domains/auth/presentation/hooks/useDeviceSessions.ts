import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { cacheConfig } from '@/app/config/constants';
import { useUseCases } from '@/app/providers/ContainerProvider';
import { queryKeys } from '@/infrastructure/query/queryKeys';

import type { DeviceSession } from '../../domain/entities/DeviceSession';
import { useAuthStore } from '../stores/authStore';

export type DeviceSessionsView = {
  readonly current: DeviceSession | null;
  readonly others: readonly DeviceSession[];
  readonly isLoading: boolean;
  readonly error: unknown;
};

export function useDeviceSessions(): DeviceSessionsView {
  const { listDeviceSessions } = useUseCases();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  const query = useQuery({
    queryKey: queryKeys.sessions(),
    queryFn: () => listDeviceSessions(),
    enabled: isAuthenticated,
    staleTime: cacheConfig.sessionsStaleMs,
    refetchOnMount: 'always',
  });

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
    }, [isAuthenticated, queryClient]),
  );

  const sessions = query.data ?? [];

  return {
    current: sessions.find((item) => item.current) ?? null,
    others: sessions.filter((item) => !item.current),
    isLoading: query.isLoading && query.data === undefined,
    error: query.error,
  };
}
