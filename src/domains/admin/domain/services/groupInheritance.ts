/** Collect groupId and all descendants (groups that inherit from it transitively). */
export function collectDescendantGroupIds(
  rootGroupId: string,
  childrenOf: ReadonlyMap<string, readonly string[]>,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const stack = [rootGroupId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === undefined || visited.has(current)) {
      continue;
    }

    visited.add(current);
    result.push(current);

    for (const child of childrenOf.get(current) ?? []) {
      stack.push(child);
    }
  }

  return result;
}

export function buildChildrenMap(
  groups: readonly { readonly id: string; readonly parentGroupId: string | null }[],
): Map<string, string[]> {
  const childrenOf = new Map<string, string[]>();

  for (const group of groups) {
    if (group.parentGroupId === null) {
      continue;
    }

    const siblings = childrenOf.get(group.parentGroupId) ?? [];
    siblings.push(group.id);
    childrenOf.set(group.parentGroupId, siblings);
  }

  return childrenOf;
}

/** Parent candidates for a group: everyone except self and its descendants. */
export function eligibleParentGroups<T extends { readonly id: string; readonly parentGroupId: string | null }>(
  groupId: string,
  groups: readonly T[],
): T[] {
  const childrenOf = buildChildrenMap(groups);
  const excluded = new Set(collectDescendantGroupIds(groupId, childrenOf));
  return groups.filter((group) => !excluded.has(group.id));
}

type GroupWithPermissions = {
  readonly id: string;
  readonly parentGroupId: string | null;
  readonly permissionIds: readonly string[];
};

/** Union of direct permission ids from parent and all ancestors. */
export function collectAncestorPermissionIds(
  parentGroupId: string | null,
  groups: readonly GroupWithPermissions[],
): ReadonlySet<string> {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const ids = new Set<string>();
  let current = parentGroupId;
  const visited = new Set<string>();

  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const group = byId.get(current);
    if (group === undefined) {
      break;
    }

    for (const permissionId of group.permissionIds) {
      ids.add(permissionId);
    }

    current = group.parentGroupId;
  }

  return ids;
}
