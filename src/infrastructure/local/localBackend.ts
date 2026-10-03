import { storageKeys } from '@/app/config/constants';
import type { AuthSession } from '@/domains/auth/domain/entities/AuthSession';
import type { UserProfile } from '@/domains/auth/domain/entities/UserProfile';
import { email as toEmail } from '@/domains/auth/domain/value-objects/Email';
import { type UserId, userId } from '@/domains/auth/domain/value-objects/UserId';
import type { Invitation } from '@/domains/spaces/domain/entities/Invitation';
import type { Space, SpaceType } from '@/domains/spaces/domain/entities/Space';
import { type SpaceId, spaceId as toSpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { defaultPermissionsForRole } from '@/domains/spaces/domain/value-objects/SpacePermission';
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

type LocalState = {
  users: LocalUser[];
  spaces: Space[];
  invitations: Invitation[];
};

const DEMO_SELF_NAME = 'Вы';
const DEMO_PARTNER_NAME = 'Партнёр';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function emptyState(): LocalState {
  return { users: [], spaces: [], invitations: [] };
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
 * Auth + spaces only — field/surface/timeline were wiped for a clean rebuild.
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
  listSpaces(): Promise<readonly Space[]>;
  spaceById(id: SpaceId): Promise<Space | null>;
  createSpace(input: { readonly type: SpaceType; readonly title: string }): Promise<Space>;
  invite(input: { readonly spaceId: SpaceId; readonly email: string }): Promise<Invitation>;
  respondToInvitation(invitationId: string, accept: boolean): Promise<Invitation>;
};

export function createLocalBackend(options: { readonly storage: KeyValueStorage }): LocalBackend {
  let state = emptyState();
  let hydration: Promise<void> | null = null;
  let currentUserId: UserId | null = null;

  const persist = async (): Promise<void> => {
    await options.storage.write(storageKeys.spacesSnapshot, state);
  };

  const hydrate = async (): Promise<void> => {
    const stored = await options.storage.read<LocalState>(storageKeys.spacesSnapshot);

    state = {
      users: (stored?.users ?? []).map((user) => ({
        ...user,
        avatarUrl: user.avatarUrl ?? null,
      })),
      spaces: stored?.spaces ?? [],
      invitations: stored?.invitations ?? [],
    };

    if (state.users.length === 0) {
      seed();
      await persist();
    }

    currentUserId = state.users[0]?.id ?? null;
  };

  const ready = async (): Promise<void> => {
    hydration ??= hydrate();
    await hydration;
  };

  function seed(): void {
    const now = Date.now();
    const self: LocalUser = {
      id: userId(createLocalId('usr')),
      email: null,
      password: null,
      displayName: DEMO_SELF_NAME,
      avatarUrl: null,
    };
    const partner: LocalUser = {
      id: userId(createLocalId('usr')),
      email: null,
      password: null,
      displayName: DEMO_PARTNER_NAME,
      avatarUrl: null,
    };

    const personal = buildSpace({
      type: 'Personal',
      title: 'Личное пространство',
      memberIds: [self.id],
      names: { [self.id]: self.displayName },
      createdAt: now,
    });

    const shared = buildSpace({
      type: 'Shared',
      title: 'Наше пространство',
      memberIds: [self.id, partner.id],
      names: { [self.id]: self.displayName, [partner.id]: partner.displayName },
      createdAt: now,
    });

    state = {
      users: [self, partner],
      spaces: [shared, personal],
      invitations: [],
    };
  }

  function buildSpace(input: {
    readonly type: SpaceType;
    readonly title: string;
    readonly memberIds: readonly UserId[];
    readonly names: Readonly<Record<string, string>>;
    readonly createdAt: number;
  }): Space {
    const id = toSpaceId(createLocalId('spc'));

    return {
      id,
      type: input.type,
      title: input.title,
      memberIds: input.memberIds,
      members: input.memberIds.map((memberId, index) => ({
        userId: memberId,
        role: index === 0 ? 'Owner' : 'Member',
        permissions: defaultPermissionsForRole(index === 0 ? 'Owner' : 'Member'),
        displayName: input.names[memberId] ?? 'Участник',
      })),
      createdAt: input.createdAt,
      version: 1,
    };
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
      state.spaces = state.spaces.map((space) => ({
        ...space,
        members: space.members.map((member) =>
          member.userId === updated.id ? { ...member, displayName: updated.displayName } : member,
        ),
      }));

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

      if (patch.displayName !== undefined) {
        state.spaces = state.spaces.map((space) => ({
          ...space,
          members: space.members.map((member) =>
            member.userId === id ? { ...member, displayName: updated.displayName } : member,
          ),
        }));
      }

      await persist();

      return toLocalProfile(updated);
    },

    async listSpaces() {
      await ready();

      return state.spaces;
    },

    async spaceById(id) {
      await ready();

      return state.spaces.find((space) => space.id === id) ?? null;
    },

    async createSpace(input) {
      await ready();

      const owner = currentUserId ?? state.users[0]?.id;

      if (owner === undefined) {
        throw new NetworkError('Нет активного пользователя', null);
      }

      const names: Record<string, string> = {};

      for (const user of state.users) {
        names[user.id] = user.displayName;
      }

      const space = buildSpace({
        type: input.type,
        title: input.title,
        memberIds: [owner],
        names,
        createdAt: Date.now(),
      });

      state.spaces = [space, ...state.spaces];
      await persist();

      return space;
    },

    async invite(input) {
      await ready();

      const invitation: Invitation = {
        id: createLocalId('inv'),
        spaceId: input.spaceId,
        status: 'Pending',
        invitedEmail: toEmail(input.email),
        createdAt: Date.now(),
      };

      state.invitations = [invitation, ...state.invitations];
      await persist();

      return invitation;
    },

    async respondToInvitation(invitationId, accept) {
      await ready();

      const invitation = state.invitations.find((candidate) => candidate.id === invitationId);

      if (invitation === undefined) {
        throw new NetworkError('Приглашение не найдено', 404, { context: { invitationId } });
      }

      const next: Invitation = { ...invitation, status: accept ? 'Accepted' : 'Rejected' };
      state.invitations = state.invitations.map((candidate) =>
        candidate.id === invitationId ? next : candidate,
      );
      await persist();

      return next;
    },
  };
}
