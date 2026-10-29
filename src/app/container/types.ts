import type { AdminRepository } from '@/domains/admin/domain/repositories/AdminRepository';
import type {
  AuthRepository,
  SessionStorage,
} from '@/domains/auth/domain/repositories/AuthRepository';
import type { SessionManager } from '@/domains/auth/infrastructure/sessionManager';
import type { ThemeCatalogRepository } from '@/domains/themes/domain/repositories/ThemeCatalogRepository';
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
  /** True when the app runs against the in-app sandbox instead of a server. */
  readonly isSandbox: boolean;
};

export type Repositories = {
  readonly auth: AuthRepository;
  readonly admin: AdminRepository;
  readonly themes: ThemeCatalogRepository;
};

export type Container = {
  readonly services: Services;
  readonly repositories: Repositories;
  readonly useCases: UseCases;
};
