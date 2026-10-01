import type { HttpClient } from '@/infrastructure/http/httpClient';
import type {
  AdminGroupDto,
  AdminPermissionDto,
  AdminUserDetailDto,
  AdminUserSummaryDto,
} from '@/shared/contracts';

import type { AdminRepository } from '../../domain/repositories/AdminRepository';
import {
  toAdminGroup,
  toAdminPermission,
  toAdminUserDetail,
  toAdminUserSummary,
} from '../mappers/adminMapper';

export function createHttpAdminRepository(http: HttpClient): AdminRepository {
  return {
    async listUsers() {
      const dtos = await http.get<readonly AdminUserSummaryDto[]>('admin/users');
      return dtos.map(toAdminUserSummary);
    },

    async getUser(id) {
      return toAdminUserDetail(await http.get<AdminUserDetailDto>(`admin/users/${id}`));
    },

    async setUserPermissions(id, input) {
      return toAdminUserDetail(
        await http.patch<AdminUserDetailDto>(`admin/users/${id}/permissions`, {
          overrides: input.overrides,
        }),
      );
    },

    async listPermissions() {
      const dtos = await http.get<readonly AdminPermissionDto[]>('admin/permissions');
      return dtos.map(toAdminPermission);
    },

    async listGroups() {
      const dtos = await http.get<readonly AdminGroupDto[]>('admin/groups');
      return dtos.map(toAdminGroup);
    },

    async getGroup(id) {
      return toAdminGroup(await http.get<AdminGroupDto>(`admin/groups/${id}`));
    },

    async updateGroup(id, input) {
      return toAdminGroup(await http.patch<AdminGroupDto>(`admin/groups/${id}`, input));
    },
  };
}
