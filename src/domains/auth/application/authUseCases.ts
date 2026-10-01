import type { Clock, UseCase } from '@/shared/application/UseCase';
import { UnauthorizedError, ValidationError } from '@/shared/errors';

import { hasSessionTokens, type AuthSession, isSessionExpired } from '../domain/entities/AuthSession';
import { compareDeviceSessions, isDeviceSessionActive, type DeviceSession } from '../domain/entities/DeviceSession';
import type { QrLoginPreview } from '../domain/entities/QrLoginPreview';
import type {
  AuthRepository,
  SessionStorage,
  SignInCredentials,
  SignUpCredentials,
} from '../domain/repositories/AuthRepository';
import { parseQrLoginPayload } from '../domain/services/qrLoginPayload';

export type AuthUseCaseDeps = {
  readonly auth: AuthRepository;
  readonly storage: SessionStorage;
  readonly clock: Clock;
};

/** Clear SecureStore only if it still holds the session we were restoring. */
async function clearIfStillCurrent(
  storage: SessionStorage,
  expected: AuthSession,
): Promise<void> {
  const current = await storage.read();
  if (current !== null && current.refreshToken === expected.refreshToken) {
    await storage.clear();
  }
}

export function signInUseCase(deps: AuthUseCaseDeps): UseCase<SignInCredentials, AuthSession> {
  return async (credentials) => {
    const session = await deps.auth.signIn(credentials);
    await deps.storage.write(session);
    return session;
  };
}

export function signUpUseCase(deps: AuthUseCaseDeps): UseCase<SignUpCredentials, AuthSession> {
  return async (credentials) => {
    const session = await deps.auth.signUp(credentials);
    await deps.storage.write(session);
    return session;
  };
}

export function signOutUseCase(deps: AuthUseCaseDeps): UseCase<void, void> {
  return async () => {
    const session = await deps.storage.read();

    try {
      if (session !== null) {
        await deps.auth.signOut(session);
      }
    } finally {
      // Local logout must never be blocked by a dead API or expired token.
      await deps.storage.clear();
    }
  };
}

/** Called once during bootstrap. Refreshes a stored expired session in place. */
export function restoreSessionUseCase(deps: AuthUseCaseDeps): UseCase<void, AuthSession | null> {
  return async () => {
    const stored = await deps.storage.read();
    if (stored === null || !hasSessionTokens(stored)) {
      if (stored !== null) {
        await deps.storage.clear();
      }
      return null;
    }

    if (isSessionExpired(stored, deps.clock.now())) {
      try {
        const refreshed = await deps.auth.refresh(stored.refreshToken);
        await deps.storage.write(refreshed);
        return refreshed;
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          await clearIfStillCurrent(deps.storage, stored);
          return null;
        }

        // Offline / transient: keep tokens; integrity probe retries later.
        return stored;
      }
    }

    // Access still looks fresh locally — confirm the server still knows this
    // session (revoked elsewhere must not leave the app "authenticated").
    try {
      await deps.auth.profile(stored);
      return stored;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        await clearIfStillCurrent(deps.storage, stored);
        return null;
      }

      // Offline / transient: keep the local session and probe again later.
      return stored;
    }
  };
}

function requireQrLoginToken(raw: string): string {
  const token = parseQrLoginPayload(raw);
  if (token === null) {
    throw new ValidationError('Это не код входа Twilite');
  }
  return token;
}

export function inspectQrLoginUseCase(
  deps: AuthUseCaseDeps,
): UseCase<string, QrLoginPreview> {
  return async (raw) => deps.auth.inspectQrLogin(requireQrLoginToken(raw));
}

export function approveQrLoginUseCase(deps: AuthUseCaseDeps): UseCase<string, void> {
  return async (raw) => {
    await deps.auth.approveQrLogin(requireQrLoginToken(raw));
  };
}

export function denyQrLoginUseCase(deps: AuthUseCaseDeps): UseCase<string, void> {
  return async (raw) => {
    await deps.auth.denyQrLogin(requireQrLoginToken(raw));
  };
}

export function listDeviceSessionsUseCase(
  deps: AuthUseCaseDeps,
): UseCase<void, readonly DeviceSession[]> {
  return async () => {
    const now = deps.clock.now();
    const sessions = await deps.auth.listSessions();
    return [...sessions]
      .filter((session) => isDeviceSessionActive(session, now))
      .sort(compareDeviceSessions);
  };
}

export function revokeDeviceSessionUseCase(
  deps: AuthUseCaseDeps,
): UseCase<{ readonly sessionId: string; readonly clearLocal: boolean }, void> {
  return async ({ sessionId, clearLocal }) => {
    try {
      await deps.auth.revokeSession(sessionId);
    } finally {
      if (clearLocal) {
        await deps.storage.clear();
      }
    }
  };
}

export type RevokeAllDeviceSessionsResult = {
  readonly signedOutLocally: true;
};

export function revokeAllDeviceSessionsUseCase(
  deps: AuthUseCaseDeps,
): UseCase<void, RevokeAllDeviceSessionsResult> {
  return async () => {
    try {
      await deps.auth.revokeAllSessions();
    } finally {
      await deps.storage.clear();
    }

    return { signedOutLocally: true };
  };
}
