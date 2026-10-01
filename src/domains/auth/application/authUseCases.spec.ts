import { describe, expect, it, vi } from 'vitest';

import { NetworkError, UnauthorizedError } from '@/shared/errors';

import type { AuthSession } from '../domain/entities/AuthSession';
import type { AuthRepository, SessionStorage } from '../domain/repositories/AuthRepository';
import { userId } from '../domain/value-objects/UserId';
import { restoreSessionUseCase } from './authUseCases';

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 120_000,
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

describe('restoreSessionUseCase', () => {
  it('keeps a fresh session after a successful profile probe', async () => {
    const stored = session();
    const storage = memoryStorage(stored);
    const profile = vi.fn(async () => ({ id: stored.userId }));

    const restore = restoreSessionUseCase({
      auth: { profile } as unknown as AuthRepository,
      storage,
      clock: { now: () => Date.now() },
    });

    await expect(restore()).resolves.toEqual(stored);
    expect(profile).toHaveBeenCalledTimes(1);
    expect(await storage.read()).toEqual(stored);
  });

  it('does not wipe a newer sign-in when a stale restore gets 401', async () => {
    const stale = session({ refreshToken: 'stale-refresh' });
    const newer = session({
      accessToken: 'access-new',
      refreshToken: 'fresh-refresh',
      expiresAt: Date.now() + 120_000,
    });
    const storage = memoryStorage(stale);
    const profile = vi.fn(async () => {
      await storage.write(newer);
      throw new UnauthorizedError('Сессия недействительна');
    });

    const restore = restoreSessionUseCase({
      auth: { profile } as unknown as AuthRepository,
      storage,
      clock: { now: () => Date.now() },
    });

    await expect(restore()).resolves.toBeNull();
    expect(await storage.read()).toEqual(newer);
  });

  it('keeps expired tokens when refresh fails offline', async () => {
    const expired = session({ expiresAt: Date.now() - 60_000 });
    const storage = memoryStorage(expired);

    const restore = restoreSessionUseCase({
      auth: {
        refresh: async () => {
          throw new NetworkError('Нет соединения с сервером');
        },
      } as unknown as AuthRepository,
      storage,
      clock: { now: () => Date.now() },
    });

    await expect(restore()).resolves.toEqual(expired);
    expect(await storage.read()).toEqual(expired);
  });
});
