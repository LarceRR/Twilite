import { useCallback, useEffect, useRef } from 'react';

import { useContainer } from '@/app/providers/ContainerProvider';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { UnauthorizedError } from '@/shared/errors';

/**
 * Loads GET users/me into the auth store after login/bootstrap so RBAC
 * permissions are available to <Can> and profile UI.
 */
export function useHydrateAuthProfile(isReady: boolean): void {
  const { repositories, services } = useContainer();
  const status = useAuthStore((state) => state.status);
  const loading = useRef(false);

  const hydrate = useCallback(async (): Promise<void> => {
    if (loading.current) {
      return;
    }

    if (useAuthStore.getState().status !== 'authenticated') {
      return;
    }

    loading.current = true;
    try {
      const session = services.sessions.current() ?? useAuthStore.getState().session;
      if (session === null) {
        return;
      }

      const profile = await repositories.auth.profile(session);
      useAuthStore.getState().setProfile(profile);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        services.logger.debug('Profile hydrate skipped', { error: String(error) });
      }
    } finally {
      loading.current = false;
    }
  }, [repositories.auth, services.logger, services.sessions]);

  useEffect(() => {
    if (!isReady || status !== 'authenticated') {
      if (status === 'anonymous') {
        useAuthStore.getState().setProfile(null);
      }
      return;
    }

    void hydrate();
  }, [hydrate, isReady, status]);
}
