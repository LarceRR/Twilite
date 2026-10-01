export const adminQueryKeys = {
  all: ['admin'] as const,
  users: () => [...adminQueryKeys.all, 'users'] as const,
  user: (id: string) => [...adminQueryKeys.users(), id] as const,
  permissions: () => [...adminQueryKeys.all, 'permissions'] as const,
  groups: () => [...adminQueryKeys.all, 'groups'] as const,
  group: (id: string) => [...adminQueryKeys.groups(), id] as const,
};
