import type {
  AdminGroupDto,
  AdminPermissionDto,
  AdminUserDetailDto,
  AdminUserSummaryDto,
} from '@/shared/contracts';

import type {
  AdminGroup,
  AdminPermission,
  AdminUserDetail,
  AdminUserSummary,
} from '../../domain/entities/AdminModels';

export function toAdminPermission(dto: AdminPermissionDto): AdminPermission {
  return {
    id: dto.id,
    name: dto.name,
    descriptionEn: dto.descriptionEn,
    descriptionRu: dto.descriptionRu,
    module: dto.module,
  };
}

export function toAdminGroup(dto: AdminGroupDto): AdminGroup {
  return {
    id: dto.id,
    name: dto.name,
    descriptionEn: dto.descriptionEn,
    descriptionRu: dto.descriptionRu,
    parentGroupId: dto.parentGroupId,
    isDefault: dto.isDefault,
    permissionIds: [...dto.permissionIds],
    permissionNames: [...dto.permissionNames],
  };
}

export function toAdminUserSummary(dto: AdminUserSummaryDto): AdminUserSummary {
  return {
    id: dto.id,
    email: dto.email,
    displayName: dto.displayName,
    avatarUrl: dto.avatarUrl,
    createdAt: dto.createdAt,
  };
}

export function toAdminUserDetail(dto: AdminUserDetailDto): AdminUserDetail {
  return {
    ...toAdminUserSummary(dto),
    groups: dto.groups.map((group) => ({ id: group.id, name: group.name })),
    overrides: dto.overrides.map((override) => ({
      permissionId: override.permissionId,
      permissionName: override.permissionName,
      type: override.type,
    })),
    permissions: [...dto.permissions],
  };
}
