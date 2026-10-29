import { storageKeys } from '@/app/config/constants';
import type { AuthSession } from '@/domains/auth/domain/entities/AuthSession';
import type { UserProfile } from '@/domains/auth/domain/entities/UserProfile';
import { email as toEmail } from '@/domains/auth/domain/value-objects/Email';
import { type UserId, userId } from '@/domains/auth/domain/value-objects/UserId';
import { NetworkError } from '@/shared/errors';
import { createLocalId } from '@/shared/utils/id';

import type { KeyValueStorage } from '../storage/keyValueStorage';

type LocalUser = {
  readonly id: UserId;
  readonly email: string | null;
  readonly password: string | null;
  readonly displayName: string;
  readonly avatarUrl: string | null;
};

type LocalState = { users: LocalUser[] };

type StoredLocalState = { readonly users?: readonly LocalUser[] };

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function emptyState(): LocalState {
  return { users: [] };
}

function toLocalProfile(user: LocalUser): UserProfile {
  return {
    id: user.id,
    email: user.email === null ? null : toEmail(user.email),
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    groups: [],
    permissions: [],
  };
}

/**
 * In-app stand-in for the backend, used whenever no API base URL is configured.
 */
export type LocalBackend = {
  ready(): Promise<void>;
  signIn(credentials: { readonly email: string; readonly password: string }): Promise<AuthSession>;
  signUp(credentials: {
    readonly email: string;
    readonly password: string;
    readonly displayName: string;
  }): Promise<AuthSession>;
  signInAnonymously(): Promise<AuthSession>;
  profile(id: UserId): Promise<UserProfile>;
  updateProfile(patch: {
    readonly displayName?: string;
    readonly avatarUrl?: string | null;
  }): Promise<UserProfile>;
};

export function createLocalBackend(options: { readonly storage: KeyValueStorage }): LocalBackend {
  let state = emptyState();
  let hydration: Promise<void> | null = null;
  let currentUserId: UserId | null = null;

  const persist = async (): Promise<void> => {
    await options.storage.write(storageKeys.localBackendState, state);
  };

  const hydrate = async (): Promise<void> => {
    const stored = await options.storage.read<StoredLocalState>(storageKeys.localBackendState);
    const legacy =
      stored === null
        ? await options.storage.read<StoredLocalState>(storageKeys.legacySpacesSnapshot)
        : null;
    const persisted = stored ?? legacy;

    state = {
      users: (persisted?.users ?? []).map((user) => ({
        ...user,
        avatarUrl: user.avatarUrl ?? null,
      })),
    };

    if (state.users.length === 0) {
      seed();
    }

    await persist();
    if (legacy !== null) await options.storage.remove(storageKeys.legacySpacesSnapshot);
    currentUserId = state.users[0]?.id ?? null;
  };

  const ready = async (): Promise<void> => {
    hydration ??= hydrate();
    await hydration;
  };

  function seed(): void {
    const self: LocalUser = {
      id: userId(createLocalId('usr')),
      email: null,
      password: null,
      displayName: 'Вы',
      avatarUrl: null,
    };

    state = { users: [self] };
  }

  const issueSession = (user: LocalUser): AuthSession => {
    currentUserId = user.id;

    return {
      accessToken: `local.${user.id}`,
      refreshToken: `local.refresh.${user.id}`,
      expiresAt: Date.now() + SESSION_LIFETIME_MS,
      userId: user.id,
    };
  };

  return {
    ready,

    async signIn(credentials) {
      await ready();

      const normalized = credentials.email.trim().toLowerCase();
      const existing = state.users.find((user) => user.email === normalized);

      if (existing === undefined) {
        const [self] = state.users;

        if (self === undefined) {
          throw new NetworkError('Локальное хранилище не готово', null);
        }

        const bound: LocalUser = { ...self, email: normalized, password: credentials.password };
        state.users = state.users.map((user) => (user.id === self.id ? bound : user));
        await persist();

        return issueSession(bound);
      }

      return issueSession(existing);
    },

    async signUp(credentials) {
      await ready();

      const normalized = credentials.email.trim().toLowerCase();
      const [self] = state.users;

      if (self === undefined) {
        throw new NetworkError('Локальное хранилище не готово', null);
      }

      const updated: LocalUser = {
        ...self,
        email: normalized,
        password: credentials.password,
        displayName: credentials.displayName,
      };

      state.users = state.users.map((user) => (user.id === self.id ? updated : user));

      await persist();

      return issueSession(updated);
    },

    async signInAnonymously() {
      await ready();

      const [self] = state.users;

      if (self === undefined) {
        throw new NetworkError('Локальное хранилище не готово', null);
      }

      return issueSession(self);
    },

    async profile(id) {
      await ready();

      const user = state.users.find((candidate) => candidate.id === id);

      if (user === undefined) {
        throw new NetworkError('Профиль не найден', 404, { context: { id } });
      }

      return toLocalProfile(user);
    },

    async updateProfile(patch) {
      await ready();

      const id = currentUserId ?? state.users[0]?.id;

      if (id === undefined) {
        throw new NetworkError('Нет активного пользователя', null);
      }

      const user = state.users.find((candidate) => candidate.id === id);

      if (user === undefined) {
        throw new NetworkError('Профиль не найден', 404, { context: { id } });
      }

      const updated: LocalUser = {
        ...user,
        ...(patch.displayName === undefined ? {} : { displayName: patch.displayName }),
        ...(patch.avatarUrl === undefined ? {} : { avatarUrl: patch.avatarUrl }),
      };

      state.users = state.users.map((candidate) => (candidate.id === id ? updated : candidate));

      await persist();

      return toLocalProfile(updated);
    },
  };
}
