import { storageKeys } from '@/app/config/constants';
import type { AuthSession } from '@/domains/auth/domain/entities/AuthSession';
import type { UserProfile } from '@/domains/auth/domain/entities/UserProfile';
import { email as toEmail } from '@/domains/auth/domain/value-objects/Email';
import { type UserId, userId } from '@/domains/auth/domain/value-objects/UserId';
import type { Invitation } from '@/domains/spaces/domain/entities/Invitation';
import type { Space, SpaceType } from '@/domains/spaces/domain/entities/Space';
import { type SpaceId, spaceId as toSpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { defaultPermissionsForRole } from '@/domains/spaces/domain/value-objects/SpacePermission';
import type { SurfaceObject } from '@/domains/surface-objects/domain/entities/SurfaceObject';
import type { Cell } from '@/domains/surface-objects/domain/value-objects/Cell';
import {
  type SurfaceObjectId,
  surfaceObjectId as toSurfaceObjectId,
} from '@/domains/surface-objects/domain/value-objects/SurfaceObjectId';
import {
  kindPolicy,
  knownKinds,
  type SurfaceObjectKind,
} from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';
import {
  canApplyTransition,
  type SurfaceObjectTransition,
  transitionTarget,
} from '@/domains/surface-objects/domain/value-objects/SurfaceObjectState';
import type { Surface } from '@/domains/surfaces/domain/entities/Surface';
import { spawnBridgeRow } from '@/domains/surfaces/domain/services/spawnBridgeRow';
import { boundsFromCells } from '@/domains/surfaces/domain/value-objects/SurfaceBounds';
import { surfaceId as toSurfaceId } from '@/domains/surfaces/domain/value-objects/SurfaceId';
import type { TimelineEvent } from '@/domains/timeline/domain/entities/TimelineEvent';
import { ConflictError, NetworkError } from '@/shared/errors';
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
  surfaces: Surface[];
  objects: SurfaceObject[];
  invitations: Invitation[];
  timeline: TimelineEvent[];
};

const DEMO_SELF_NAME = 'Вы';
const DEMO_PARTNER_NAME = 'Партнёр';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function emptyState(): LocalState {
  return { users: [], spaces: [], surfaces: [], objects: [], invitations: [], timeline: [] };
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
 * It enforces the same invariants the server does — spawn policy, optimistic
 * locking, state transitions, timeline events — so swapping in the HTTP adapter
 * changes no behaviour above the repository ports.
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
  surfaceSnapshot(spaceId: SpaceId): Promise<{
    readonly surface: Surface;
    readonly objects: readonly SurfaceObject[];
  }>;
  listObjects(spaceId: SpaceId): Promise<readonly SurfaceObject[]>;
  createObject(input: {
    readonly spaceId: SpaceId;
    readonly kind: SurfaceObjectKind;
    readonly subjectUserId: UserId;
    readonly metadata?: Readonly<Record<string, unknown>>;
  }): Promise<SurfaceObject>;
  changeObjectState(input: {
    readonly id: SurfaceObjectId;
    readonly transition: SurfaceObjectTransition;
    readonly version: number;
  }): Promise<SurfaceObject>;
  updateObject(input: {
    readonly id: SurfaceObjectId;
    readonly version: number;
    readonly favorite?: boolean;
    readonly metadata?: Readonly<Record<string, unknown>>;
  }): Promise<SurfaceObject>;
  deleteObject(id: SurfaceObjectId, version: number): Promise<void>;
  timelinePage(input: {
    readonly spaceId: SpaceId;
    readonly cursor: string | null;
    readonly limit: number;
  }): Promise<{ readonly events: readonly TimelineEvent[]; readonly nextCursor: string | null }>;
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

    state = stored ?? emptyState();
    state.users = state.users.map((user) => ({
      ...user,
      avatarUrl: user.avatarUrl ?? null,
    }));

    if (state.users.length === 0) {
      seed();
      await persist();
    }

    const schema = (await options.storage.read<number>(storageKeys.localStateSchema)) ?? 0;

    // v1: wipe existing fires so the new isolation spawn rule starts from a clean surface.
    if (schema < 1 && state.objects.length > 0) {
      state.objects = state.objects.filter((object) => object.kind !== knownKinds.fire);

      for (const surface of state.surfaces) {
        refreshBounds(surface);
      }

      await persist();
      await options.storage.write(storageKeys.localStateSchema, 1);
    } else if (schema < 1) {
      await options.storage.write(storageKeys.localStateSchema, 1);
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
      spaces: [shared.space, personal.space],
      surfaces: [shared.surface, personal.surface],
      objects: [],
      invitations: [],
      timeline: [
        {
          id: createLocalId('evt'),
          spaceId: shared.space.id,
          type: 'SpaceCreated',
          payload: { title: shared.space.title },
          createdAt: now,
        },
      ],
    };
  }

  function buildSpace(input: {
    readonly type: SpaceType;
    readonly title: string;
    readonly memberIds: readonly UserId[];
    readonly names: Readonly<Record<string, string>>;
    readonly createdAt: number;
  }): { readonly space: Space; readonly surface: Surface } {
    const id = toSpaceId(createLocalId('spc'));

    const space: Space = {
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

    const surface: Surface = {
      id: toSurfaceId(createLocalId('srf')),
      spaceId: id,
      bounds: null,
      version: 1,
    };

    return { space, surface };
  }

  const requireSurface = (spaceId: SpaceId): Surface => {
    const surface = state.surfaces.find((candidate) => candidate.spaceId === spaceId);

    if (surface === undefined) {
      throw new NetworkError('Поверхность не найдена', 404, { context: { spaceId } });
    }

    return surface;
  };

  const requireObject = (id: SurfaceObjectId): SurfaceObject => {
    const object = state.objects.find((candidate) => candidate.id === id);

    if (object === undefined) {
      throw new NetworkError('Объект не найден', 404, { context: { id } });
    }

    return object;
  };

  const assertVersion = (object: SurfaceObject, version: number): void => {
    if (object.version !== version) {
      throw new ConflictError('Объект был изменён другим участником', version, object.version, {
        context: { id: object.id },
      });
    }
  };

  const recordEvent = (
    spaceId: SpaceId,
    type: TimelineEvent['type'],
    payload: Readonly<Record<string, unknown>>,
  ): void => {
    state.timeline = [
      { id: createLocalId('evt'), spaceId, type, payload, createdAt: Date.now() },
      ...state.timeline,
    ];
  };

  const refreshBounds = (surface: Surface): void => {
    const cells = state.objects
      .filter((object) => object.spaceId === surface.spaceId)
      .map((object) => object.cell);

    const next: Surface = {
      ...surface,
      bounds: cells.length === 0 ? null : boundsFromCells(cells),
      version: surface.version + 1,
    };

    state.surfaces = state.surfaces.map((candidate) =>
      candidate.id === surface.id ? next : candidate,
    );
  };

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
        // The sandbox has no user directory: binding the address to the local
        // identity keeps sign-in usable without a server.
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

      const built = buildSpace({
        type: input.type,
        title: input.title,
        memberIds: [owner],
        names,
        createdAt: Date.now(),
      });

      state.spaces = [built.space, ...state.spaces];
      state.surfaces = [built.surface, ...state.surfaces];
      recordEvent(built.space.id, 'SpaceCreated', { title: built.space.title });
      await persist();

      return built.space;
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

    async surfaceSnapshot(spaceId) {
      await ready();

      return {
        surface: requireSurface(spaceId),
        objects: state.objects.filter((object) => object.spaceId === spaceId),
      };
    },

    async listObjects(spaceId) {
      await ready();

      return state.objects.filter((object) => object.spaceId === spaceId);
    },

    async createObject(input) {
      await ready();

      const surface = requireSurface(input.spaceId);
      const creator = currentUserId ?? state.users[0]?.id;

      if (creator === undefined) {
        throw new NetworkError('Нет активного пользователя', null);
      }

      const objectsInSpace = state.objects.filter((object) => object.spaceId === input.spaceId);
      const occupied: readonly Cell[] = objectsInSpace.map((object) => object.cell);
      const lastCreated = objectsInSpace.reduce<(typeof objectsInSpace)[number] | undefined>(
        (latest, object) => {
          if (latest === undefined || object.createdAt >= latest.createdAt) {
            return object;
          }

          return latest;
        },
        undefined,
      );

      const placement = spawnBridgeRow({
        occupied,
        random: Math.random,
        ...(lastCreated === undefined ? {} : { lastCreated: lastCreated.cell }),
      });

      const now = Date.now();
      const created: SurfaceObject = {
        id: toSurfaceObjectId(createLocalId('sob')),
        spaceId: input.spaceId,
        surfaceId: surface.id,
        cell: placement,
        kind: input.kind,
        state: 'Emerging',
        createdByUserId: creator,
        subjectUserId: input.subjectUserId,
        metadata: input.metadata ?? {},
        favorite: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      state.objects = [...state.objects, created];
      refreshBounds(surface);
      recordEvent(input.spaceId, 'SurfaceObjectCreated', {
        id: created.id,
        kind: created.kind,
        subjectUserId: created.subjectUserId,
      });
      await persist();

      return created;
    },

    async changeObjectState(input) {
      await ready();

      const object = requireObject(input.id);
      assertVersion(object, input.version);

      if (!canApplyTransition(object.state, input.transition)) {
        throw new ConflictError('Недопустимый переход состояния', input.version, object.version, {
          context: { state: object.state, transition: input.transition },
        });
      }

      const next: SurfaceObject = {
        ...object,
        state: transitionTarget(input.transition),
        updatedAt: Date.now(),
        version: object.version + 1,
      };

      state.objects = state.objects.map((candidate) =>
        candidate.id === next.id ? next : candidate,
      );
      recordEvent(next.spaceId, 'SurfaceObjectStateChanged', {
        id: next.id,
        state: next.state,
        kind: next.kind,
      });
      await persist();

      return next;
    },

    async updateObject(input) {
      await ready();

      const object = requireObject(input.id);
      assertVersion(object, input.version);

      const next: SurfaceObject = {
        ...object,
        favorite: input.favorite ?? object.favorite,
        metadata:
          input.metadata === undefined
            ? object.metadata
            : { ...object.metadata, ...input.metadata },
        updatedAt: Date.now(),
        version: object.version + 1,
      };

      state.objects = state.objects.map((candidate) =>
        candidate.id === next.id ? next : candidate,
      );
      await persist();

      return next;
    },

    async deleteObject(id, version) {
      await ready();

      const object = requireObject(id);
      assertVersion(object, version);

      state.objects = state.objects.filter((candidate) => candidate.id !== id);
      refreshBounds(requireSurface(object.spaceId));
      recordEvent(object.spaceId, 'SurfaceObjectDeleted', { id, kind: object.kind });
      await persist();
    },

    async timelinePage(input) {
      await ready();

      const events = state.timeline.filter((event) => event.spaceId === input.spaceId);
      const startIndex =
        input.cursor === null ? 0 : events.findIndex((event) => event.id === input.cursor) + 1;
      const page = events.slice(startIndex, startIndex + input.limit);
      const last = page[page.length - 1];
      const hasMore = startIndex + page.length < events.length;

      return {
        events: page,
        nextCursor: hasMore && last !== undefined ? last.id : null,
      };
    },
  };
}
