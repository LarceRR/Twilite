import type { AdminRepository } from '@/domains/admin/domain/repositories/AdminRepository';
import type { CurrentUser } from '@/domains/auth/application/CurrentUser';
import type {
  AuthRepository,
  SessionStorage,
} from '@/domains/auth/domain/repositories/AuthRepository';
import type { SessionManager } from '@/domains/auth/infrastructure/sessionManager';
import type { SpaceRepository } from '@/domains/spaces/domain/repositories/SpaceRepository';
import type { ThemeCatalogRepository } from '@/domains/themes/domain/repositories/ThemeCatalogRepository';
import type { OfflineQueue } from '@/infrastructure/offline-queue/offlineQueue';
import type { RealtimeClient } from '@/infrastructure/realtime/realtimeClient';
import type { KeyValueStorage } from '@/infrastructure/storage/keyValueStorage';
import type { Clock } from '@/shared/application/UseCase';
import type { Logger } from '@/shared/logger';

import type { UseCases } from './useCases';

export type Services = {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly storage: KeyValueStorage;
  readonly sessionStorage: SessionStorage;
  readonly sessions: SessionManager;
  readonly offlineQueue: OfflineQueue;
  readonly realtime: RealtimeClient | null;
  readonly currentUser: CurrentUser;
  /** True when the app runs against the in-app sandbox instead of a server. */
  readonly isSandbox: boolean;
};

export type Repositories = {
  readonly auth: AuthRepository;
  readonly admin: AdminRepository;
  readonly spaces: SpaceRepository;
  readonly themes: ThemeCatalogRepository;
};

export type Container = {
  readonly services: Services;
  readonly repositories: Repositories;
  readonly useCases: UseCases;
};
