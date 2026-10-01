import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useContainer } from '@/app/providers/ContainerProvider';
import { UnauthorizedError } from '@/shared/errors';

import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

/**
 * Asks the server whether the local session is still alive.
 *
 * Revoked/expired rows are rejected by JwtAuthGuard; the HTTP client then fails
 * refresh and SessionManager drops the session, which flips auth status to
 * anonymous. The root auth gate alone is responsible for navigating to sign-in.
 */
export function useSessionIntegrity(isReady: boolean): void {
  const { repositories, services } = useContainer();
  const status = useAuthStore((state) => state.status);
  const probing = useRef(false);

  const probe = useCallback(async (): Promise<void> => {
    if (probing.current || services.isSandbox) {
      return;
    }

    if (useAuthStore.getState().status !== 'authenticated') {
      return;
    }

    probing.current = true;
    try {
      const session = services.sessions.current() ?? useAuthStore.getState().session;
      if (session === null) {
        return;
      }

      const profile = await repositories.auth.profile(session);
      useAuthStore.getState().setProfile(profile);
    } catch (error) {
      // Unauthorized: SessionManager already cleared via failed refresh.
      // Network/transient: keep the local session and retry on next resume.
      if (!(error instanceof UnauthorizedError)) {
        services.logger.debug('Session probe skipped', {
          error: String(error),
        });
      }
    } finally {
      probing.current = false;
    }
  }, [repositories.auth, services.isSandbox, services.logger, services.sessions]);

  useEffect(() => {
    if (!isReady || status !== 'authenticated') {
      return;
    }

    void probe();
  }, [isReady, probe, status]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        void probe();
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [isReady, probe]);
}
