import { describe, expect, it } from 'vitest';

import { collectAncestorPermissionIds } from './groupInheritance';

describe('collectAncestorPermissionIds', () => {
  const groups = [
    { id: 'user', parentGroupId: null, permissionIds: ['p-user'] },
    { id: 'artist', parentGroupId: 'user', permissionIds: ['p-artist'] },
    { id: 'admin', parentGroupId: 'artist', permissionIds: ['p-admin'] },
  ] as const;

  it('unions permissions from the parent chain', () => {
    expect([...collectAncestorPermissionIds('artist', groups)].sort()).toEqual([
      'p-artist',
      'p-user',
    ]);
  });

  it('returns empty when there is no parent', () => {
    expect(collectAncestorPermissionIds(null, groups).size).toBe(0);
  });
});
