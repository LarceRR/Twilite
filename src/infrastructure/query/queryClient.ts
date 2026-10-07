import { QueryClient } from '@tanstack/react-query';

import { cacheConfig } from '@/app/config/constants';
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from '@/shared/errors';

/**
 * Retrying is only useful for transport failures. Domain answers — 401/403/409
 * and validation errors — are final, so they fail fast instead of burning
 * battery on three identical round trips.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (
    error instanceof UnauthorizedError ||
    error instanceof ForbiddenError ||
    error instanceof ConflictError ||
    error instanceof ValidationError
  ) {
    return false;
  }

  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: cacheConfig.activeSpaceTtlMs,
        gcTime: 30 * 60_000,
        retry: shouldRetry,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        /** Cached data is shown immediately; revalidation happens in the background. */
        placeholderData: <T>(previous: T | undefined) => previous,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
