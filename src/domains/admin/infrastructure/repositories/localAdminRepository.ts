import { DomainError } from '@/shared/errors';

import type { AdminRepository } from '../../domain/repositories/AdminRepository';

function sandboxAdmin(): never {
  throw new DomainError('Админ-панель недоступна без сервера');
}

/** Sandbox stub: admin endpoints are server-only. */
export function createLocalAdminRepository(): AdminRepository {
  return {
    listUsers: async () => sandboxAdmin(),
    getUser: async () => sandboxAdmin(),
    setUserPermissions: async () => sandboxAdmin(),
    listPermissions: async () => sandboxAdmin(),
    listGroups: async () => sandboxAdmin(),
    getGroup: async () => sandboxAdmin(),
    updateGroup: async () => sandboxAdmin(),
  };
}
