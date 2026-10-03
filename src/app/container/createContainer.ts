import { createHttpAdminRepository } from '@/domains/admin/infrastructure/repositories/httpAdminRepository';
import { createLocalAdminRepository } from '@/domains/admin/infrastructure/repositories/localAdminRepository';
import {
  approveQrLoginUseCase,
  denyQrLoginUseCase,
  inspectQrLoginUseCase,
  listDeviceSessionsUseCase,
  restoreSessionUseCase,
  revokeAllDeviceSessionsUseCase,
  revokeDeviceSessionUseCase,
  signInUseCase,
  signOutUseCase,
  signUpUseCase,
} from '@/domains/auth/application/authUseCases';
import type { AuthRepository } from '@/domains/auth/domain/repositories/AuthRepository';
import { createHttpAuthRepository } from '@/domains/auth/infrastructure/repositories/httpAuthRepository';
import { createLocalAuthRepository } from '@/domains/auth/infrastructure/repositories/localAuthRepository';
import { createSessionManager } from '@/domains/auth/infrastructure/sessionManager';
import {
  createSpaceUseCase,
  inviteMemberUseCase,
  listSpacesUseCase,
  respondToInvitationUseCase,
} from '@/domains/spaces/application/spaceUseCases';
import { createHttpSpaceRepository } from '@/domains/spaces/infrastructure/repositories/httpSpaceRepository';
import { createLocalSpaceRepository } from '@/domains/spaces/infrastructure/repositories/localSpaceRepository';
import {
  applyThemeUseCase,
  getThemeDetailUseCase,
  hydrateAppliedThemeUseCase,
  listPublishedThemesUseCase,
} from '@/domains/themes/application/themeUseCases';
import {
  createHttpThemeCatalogRepository,
  createLocalThemeCatalogRepository,
} from '@/domains/themes/infrastructure/repositories/httpThemeCatalogRepository';
import { createHttpClient, type HttpClient } from '@/infrastructure/http/httpClient';
import { createLocalBackend } from '@/infrastructure/local/localBackend';
import { createOfflineQueue } from '@/infrastructure/offline-queue/offlineQueue';
import { createRealtimeClient } from '@/infrastructure/realtime/realtimeClient';
import { createKeyValueStorage } from '@/infrastructure/storage/keyValueStorage';
import { createSecureSessionStorage } from '@/infrastructure/storage/secureSessionStorage';
import { systemClock } from '@/shared/application/UseCase';
import { UnknownError } from '@/shared/errors';
import { createConsoleTransport, createLogger, type LogTransport } from '@/shared/logger';

import { env } from '../config/env';
import type { Container, Repositories, Services } from './types';

export type ContainerHooks = {
  readonly onSessionChange: (
    session: import('@/domains/auth/domain/entities/AuthSession').AuthSession | null,
  ) => void;
  readonly currentUserId: () => import('@/domains/auth/domain/value-objects/UserId').UserId | null;
  readonly onQueueSizeChange: (size: number) => void;
  readonly onRealtimeReconnected: () => void;
  readonly onOfflineConflict: () => void;
};

/**
 * The single composition root. Every dependency is created here and passed down;
 * nothing reaches for a module-level singleton.
 *
 * Adapter choice is a configuration decision: with no `apiBaseUrl` the app runs
 * on the in-app sandbox backend, which is only allowed in development.
 */
export function createContainer(hooks: ContainerHooks): Container {
  const transports: LogTransport[] = [];

  if (env.isDev) {
    transports.push(createConsoleTransport('debug'));
  }

  const logger = createLogger({
    scope: 'twilite',
    transports,
    baseMeta: { mode: env.mode },
  });

  const storage = createKeyValueStorage((error) => {
    logger.error('Сбой локального хранилища', error);
  });

  const sessionStorage = createSecureSessionStorage((error) => {
    logger.error('Сбой защищённого хранилища', error);
  });

  let authRepository: AuthRepository | null = null;

  const sessions = createSessionManager({
    storage: sessionStorage,
    clock: systemClock,
    repository: () => {
      if (authRepository === null) {
        throw new UnknownError('Контейнер ещё не собран: нет auth-репозитория');
      }

      return authRepository;
    },
    onSessionChange: hooks.onSessionChange,
  });

  const isSandbox = env.apiBaseUrl === null;

  if (env.isProduction && isSandbox) {
    throw new UnknownError(
      'Production app cannot start without an API base URL',
    );
  }

  let repositories: Repositories;
  let http: HttpClient | null = null;

  if (isSandbox) {
    const backend = createLocalBackend({ storage });

    repositories = {
      auth: createLocalAuthRepository(backend),
      admin: createLocalAdminRepository(),
      spaces: createLocalSpaceRepository(backend),
      themes: createLocalThemeCatalogRepository(storage),
    };
  } else {
    const apiBaseUrl = env.apiBaseUrl;

    if (apiBaseUrl === null) {
      throw new UnknownError(
        `API base URL is required in ${env.mode} mode`,
      );
    }

    http = createHttpClient({
      baseUrl: apiBaseUrl,
      tokens: sessions,
      logger,
    });

    repositories = {
      auth: createHttpAuthRepository(http),
      admin: createHttpAdminRepository(http),
      spaces: createHttpSpaceRepository(http),
      themes: createHttpThemeCatalogRepository(http, storage),
    };
  }

  authRepository = repositories.auth;

  const offlineQueue = createOfflineQueue({
    storage,
    logger,
    onConflict: () => {
      hooks.onOfflineConflict();
    },
  });

  offlineQueue.onChange(hooks.onQueueSizeChange);

  const realtime =
    env.websocketUrl === null
      ? null
      : createRealtimeClient({
          url: env.websocketUrl,
          token: () => sessions.token(),
          logger,
          onReconnected: hooks.onRealtimeReconnected,
        });

  const currentUser = {
    id: hooks.currentUserId,
  };

  const services: Services = {
    logger,
    clock: systemClock,
    storage,
    sessionStorage,
    sessions,
    offlineQueue,
    realtime,
    currentUser,
    isSandbox,
  };

  const authDeps = {
    auth: repositories.auth,
    storage: sessionStorage,
    clock: systemClock,
  };

  const spaceDeps = {
    spaces: repositories.spaces,
    currentUser,
  };

  return {
    services,
    repositories,
    useCases: {
      signIn: signInUseCase(authDeps),
      signUp: signUpUseCase(authDeps),
      signOut: signOutUseCase(authDeps),
      restoreSession: restoreSessionUseCase(authDeps),
      inspectQrLogin: inspectQrLoginUseCase(authDeps),
      approveQrLogin: approveQrLoginUseCase(authDeps),
      denyQrLogin: denyQrLoginUseCase(authDeps),
      listDeviceSessions: listDeviceSessionsUseCase(authDeps),
      revokeDeviceSession: revokeDeviceSessionUseCase(authDeps),
      revokeAllDeviceSessions: revokeAllDeviceSessionsUseCase(authDeps),

      listSpaces: listSpacesUseCase(spaceDeps),
      createSpace: createSpaceUseCase(spaceDeps),
      inviteMember: inviteMemberUseCase(spaceDeps),
      respondToInvitation: respondToInvitationUseCase(spaceDeps),

      listPublishedThemes: listPublishedThemesUseCase(repositories.themes),
      getThemeDetail: getThemeDetailUseCase(repositories.themes),
      applyTheme: applyThemeUseCase(repositories.themes),
      hydrateAppliedTheme: hydrateAppliedThemeUseCase(repositories.themes),
    },
  };
}
