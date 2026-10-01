export type AdminPermission = {
  readonly id: string;
  readonly name: string;
  readonly descriptionEn: string;
  readonly descriptionRu: string;
  readonly module: string;
};

export type AdminGroup = {
  readonly id: string;
  readonly name: string;
  readonly descriptionEn: string;
  readonly descriptionRu: string;
  readonly parentGroupId: string | null;
  readonly isDefault: boolean;
  readonly permissionIds: readonly string[];
  readonly permissionNames: readonly string[];
};

export type AdminUserSummary = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
};

export type AdminUserOverride = {
  readonly permissionId: string;
  readonly permissionName: string;
  readonly type: 'GRANT' | 'DENY';
};

export type AdminUserDetail = AdminUserSummary & {
  readonly groups: readonly { readonly id: string; readonly name: string }[];
  readonly overrides: readonly AdminUserOverride[];
  readonly permissions: readonly string[];
};

export type UpdateGroupInput = {
  readonly name?: string;
  readonly descriptionEn?: string;
  readonly descriptionRu?: string;
  readonly parentGroupId?: string | null;
  readonly permissionIds?: readonly string[];
};

export type SetUserPermissionsInput = {
  readonly overrides: readonly {
    readonly permissionId: string;
    readonly type: 'GRANT' | 'DENY';
  }[];
};
