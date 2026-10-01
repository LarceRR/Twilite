import { describe, expect, it, vi } from 'vitest';

import { NetworkError, UnauthorizedError } from '@/shared/errors';

import type { AuthSession } from '../domain/entities/AuthSession';
import type { AuthRepository, SessionStorage } from '../domain/repositories/AuthRepository';
import { userId } from '../domain/value-objects/UserId';
import { createSessionManager } from './sessionManager';

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: Date.now() - 60_000,
    userId: userId('user-1'),
    ...overrides,
  };
}

function memoryStorage(initial: AuthSession | null = null): SessionStorage {
  let value = initial;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    clear: async () => {
      value = null;
    },
  };
}

describe('createSessionManager', () => {
  it('shares one refresh among concurrent token() callers', async () => {
    const expired = session();
    const next = session({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresAt: Date.now() + 60_000,
    });
    const storage = memoryStorage(expired);
    const refresh = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return next;
    });

    const manager = createSessionManager({
      storage,
      clock: { now: () => Date.now() },
      repository: () => ({ refresh } as unknown as AuthRepository),
      onSessionChange: vi.fn(),
    });

    const [first, second] = await Promise.all([manager.token(), manager.token()]);

    expect(first).toBe('access-2');
    expect(second).toBe('access-2');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(manager.current()?.accessToken).toBe('access-2');
  });

  it('keeps tokens when refresh fails with a network error', async () => {
    const expired = session();
    const storage = memoryStorage(expired);
    const onSessionChange = vi.fn();

    const manager = createSessionManager({
      storage,
      clock: { now: () => Date.now() },
      repository: () =>
        ({
          refresh: async () => {
            throw new NetworkError('Нет соединения с сервером');
          },
        }) as unknown as AuthRepository,
      onSessionChange,
    });

    await expect(manager.token()).resolves.toBe('access');
    expect(await storage.read()).not.toBeNull();
    expect(manager.current()?.accessToken).toBe('access');
  });

  it('drops the session when refresh is rejected as unauthorized', async () => {
    const expired = session();
    const storage = memoryStorage(expired);

    const manager = createSessionManager({
      storage,
      clock: { now: () => Date.now() },
      repository: () =>
        ({
          refresh: async () => {
            throw new UnauthorizedError('Refresh-токен уже был использован');
          },
        }) as unknown as AuthRepository,
      onSessionChange: vi.fn(),
    });

    await expect(manager.token()).resolves.toBeNull();
    expect(await storage.read()).toBeNull();
    expect(manager.current()).toBeNull();
  });
});
