import type { AccessTokenProvider } from '@/infrastructure/http/httpClient';
import type { Clock } from '@/shared/application/UseCase';
import { UnauthorizedError } from '@/shared/errors';

import { hasSessionTokens, type AuthSession, isSessionExpired } from '../domain/entities/AuthSession';
import type { AuthRepository, SessionStorage } from '../domain/repositories/AuthRepository';

export type SessionManager = AccessTokenProvider & {
  current(): AuthSession | null;
  adopt(session: AuthSession | null): void;
};

export function createSessionManager(options: {
  readonly storage: SessionStorage;
  readonly clock: Clock;
  readonly repository: () => AuthRepository;
  readonly onSessionChange: (session: AuthSession | null) => void;
}): SessionManager {
  let session: AuthSession | null = null;
  let refreshing: Promise<AuthSession | null> | null = null;

  const adopt = (next: AuthSession | null): void => {
    session = next;
    options.onSessionChange(next);
  };

  const drop = async (): Promise<null> => {
    await options.storage.clear();
    adopt(null);
    return null;
  };

  const refresh = async (): Promise<AuthSession | null> => {
    const previous = session ?? (await options.storage.read());
    if (previous === null || !hasSessionTokens(previous)) {
      return drop();
    }

    try {
      const next = await options.repository().refresh(previous.refreshToken);
      await options.storage.write(next);
      adopt(next);
      return next;
    } catch (error) {
      // Only real auth rejection logs the user out. Network blips keep tokens.
      if (error instanceof UnauthorizedError) {
        return drop();
      }

      return previous;
    }
  };

  const refreshOnce = async (): Promise<AuthSession | null> => {
    if (refreshing !== null) {
      return refreshing;
    }

    refreshing = refresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  return {
    current: () => session,
    adopt,
    async token() {
      // Storage is the source of truth: a local revoke may clear it while memory
      // still holds the previous pair until adopt(null) runs.
      const stored = await options.storage.read();
      if (stored === null || !hasSessionTokens(stored)) {
        if (session !== null) {
          adopt(null);
        }
        return null;
      }

      if (session === null || session.accessToken !== stored.accessToken) {
        adopt(stored);
      }

      if (!isSessionExpired(stored, options.clock.now())) {
        return stored.accessToken;
      }

      // auth/refresh is unauthenticated in httpClient, so awaiting the shared
      // refresh is safe — concurrent callers must wait, not send bare requests.
      return (await refreshOnce())?.accessToken ?? null;
    },
    async invalidate() {
      return (await refreshOnce())?.accessToken ?? null;
    },
  };
}
