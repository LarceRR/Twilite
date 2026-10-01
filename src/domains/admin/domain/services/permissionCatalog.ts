import type { AdminPermission } from '../entities/AdminModels';

export type PermissionModuleBucket = {
  readonly module: string;
  readonly permissions: readonly AdminPermission[];
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function permissionMatchesQuery(
  permission: AdminPermission,
  query: string,
): boolean {
  const needle = normalizeQuery(query);
  if (needle.length === 0) {
    return true;
  }

  return (
    permission.name.toLowerCase().includes(needle) ||
    permission.module.toLowerCase().includes(needle) ||
    permission.descriptionRu.toLowerCase().includes(needle) ||
    permission.descriptionEn.toLowerCase().includes(needle)
  );
}

export function filterPermissions(
  permissions: readonly AdminPermission[],
  query: string,
): AdminPermission[] {
  if (normalizeQuery(query).length === 0) {
    return [...permissions];
  }

  return permissions.filter((permission) => permissionMatchesQuery(permission, query));
}

export function groupPermissionsByModule(
  permissions: readonly AdminPermission[],
): PermissionModuleBucket[] {
  const map = new Map<string, AdminPermission[]>();

  for (const permission of permissions) {
    const list = map.get(permission.module) ?? [];
    list.push(permission);
    map.set(permission.module, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, items]) => ({
      module,
      permissions: items,
    }));
}

/** Resolve catalog entries for effective permission name strings. */
export function resolvePermissionsByName(
  names: readonly string[],
  catalog: readonly AdminPermission[],
): AdminPermission[] {
  const byName = new Map(catalog.map((permission) => [permission.name, permission]));
  const resolved: AdminPermission[] = [];

  for (const name of names) {
    const known = byName.get(name);
    if (known !== undefined) {
      resolved.push(known);
      continue;
    }

    const module = name.includes('.') ? name.slice(0, name.indexOf('.')) : 'other';
    resolved.push({
      id: `synthetic:${name}`,
      name,
      descriptionEn: name,
      descriptionRu: name,
      module,
    });
  }

  return resolved;
}
