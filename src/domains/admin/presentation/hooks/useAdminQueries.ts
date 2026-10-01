import { useQuery } from '@tanstack/react-query';

import { useContainer, useServices } from '@/app/providers/ContainerProvider';

import { adminQueryKeys } from './adminQueryKeys';

export function useAdminUsers() {
  const { repositories } = useContainer();
  const { isSandbox } = useServices();

  return useQuery({
    queryKey: adminQueryKeys.users(),
    queryFn: () => repositories.admin.listUsers(),
    enabled: !isSandbox,
  });
}

export function useAdminUser(id: string | null) {
  const { repositories } = useContainer();
  const { isSandbox } = useServices();

  return useQuery({
    queryKey: adminQueryKeys.user(id ?? ''),
    queryFn: () => {
      if (id === null) {
        throw new Error('Нет пользователя');
      }
      return repositories.admin.getUser(id);
    },
    enabled: !isSandbox && id !== null,
  });
}

export function useAdminPermissions() {
  const { repositories } = useContainer();
  const { isSandbox } = useServices();

  return useQuery({
    queryKey: adminQueryKeys.permissions(),
    queryFn: () => repositories.admin.listPermissions(),
    enabled: !isSandbox,
  });
}

export function useAdminGroups() {
  const { repositories } = useContainer();
  const { isSandbox } = useServices();

  return useQuery({
    queryKey: adminQueryKeys.groups(),
    queryFn: () => repositories.admin.listGroups(),
    enabled: !isSandbox,
  });
}

export function useAdminGroup(id: string | null) {
  const { repositories } = useContainer();
  const { isSandbox } = useServices();

  return useQuery({
    queryKey: adminQueryKeys.group(id ?? ''),
    queryFn: () => {
      if (id === null) {
        throw new Error('Нет группы');
      }
      return repositories.admin.getGroup(id);
    },
    enabled: !isSandbox && id !== null,
  });
}
