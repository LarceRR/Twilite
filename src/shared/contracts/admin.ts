export type AdminPermissionDto = {
  readonly id: string;
  readonly name: string;
  readonly descriptionEn: string;
  readonly descriptionRu: string;
  readonly module: string;
};

export type AdminGroupDto = {
  readonly id: string;
  readonly name: string;
  readonly descriptionEn: string;
  readonly descriptionRu: string;
  readonly parentGroupId: string | null;
  readonly isDefault: boolean;
  readonly permissionIds: readonly string[];
  readonly permissionNames: readonly string[];
};

export type UpdateGroupRequestDto = {
  readonly name?: string;
  readonly descriptionEn?: string;
  readonly descriptionRu?: string;
  readonly parentGroupId?: string | null;
  readonly permissionIds?: readonly string[];
};

export type AdminUserSummaryDto = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
};

export type AdminUserOverrideDto = {
  readonly permissionId: string;
  readonly permissionName: string;
  readonly type: 'GRANT' | 'DENY';
};

export type AdminUserDetailDto = AdminUserSummaryDto & {
  readonly groups: readonly { readonly id: string; readonly name: string }[];
  readonly overrides: readonly AdminUserOverrideDto[];
  readonly permissions: readonly string[];
};

export type SetUserPermissionsRequestDto = {
  readonly overrides: readonly {
    readonly permissionId: string;
    readonly type: 'GRANT' | 'DENY';
  }[];
};
