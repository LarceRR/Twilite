import type {
  AdminGroup,
  AdminPermission,
  AdminUserDetail,
  AdminUserSummary,
  SetUserPermissionsInput,
  UpdateGroupInput,
} from '../entities/AdminModels';

export type AdminRepository = {
  listUsers(): Promise<readonly AdminUserSummary[]>;
  getUser(id: string): Promise<AdminUserDetail>;
  setUserPermissions(id: string, input: SetUserPermissionsInput): Promise<AdminUserDetail>;
  listPermissions(): Promise<readonly AdminPermission[]>;
  listGroups(): Promise<readonly AdminGroup[]>;
  getGroup(id: string): Promise<AdminGroup>;
  updateGroup(id: string, input: UpdateGroupInput): Promise<AdminGroup>;
};
