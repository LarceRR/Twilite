import type { ReactElement, ReactNode } from 'react';

import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '../../domain/services/permissionMatcher';

const EMPTY_PERMISSIONS: readonly string[] = [];

export type CanProps = {
  readonly permission?: string;
  readonly anyOf?: readonly string[];
  readonly allOf?: readonly string[];
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
};

function evaluate(
  permissions: readonly string[],
  permission: string | undefined,
  anyOf: readonly string[] | undefined,
  allOf: readonly string[] | undefined,
): boolean {
  if (permission !== undefined && !hasPermission(permissions, permission)) {
    return false;
  }

  if (anyOf !== undefined && !hasAnyPermission(permissions, anyOf)) {
    return false;
  }

  if (allOf !== undefined && !hasAllPermissions(permissions, allOf)) {
    return false;
  }

  return permission !== undefined || anyOf !== undefined || allOf !== undefined;
}

function selectPermissions(
  state: { profile: { permissions: readonly string[] } | null },
): readonly string[] {
  return state.profile?.permissions ?? EMPTY_PERMISSIONS;
}

export function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: CanProps): ReactElement | null {
  const permissions = useAuthStore(selectPermissions);
  const allowed = evaluate(permissions, permission, anyOf, allOf);

  if (!allowed) {
    return fallback === null ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

export function useHasPermission(required: string): boolean {
  const permissions = useAuthStore(selectPermissions);
  return hasPermission(permissions, required);
}

export function useHasAnyPermission(required: readonly string[]): boolean {
  const permissions = useAuthStore(selectPermissions);
  return hasAnyPermission(permissions, required);
}
