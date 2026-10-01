import { describe, expect, it } from 'vitest';

import type { AdminPermission } from '../entities/AdminModels';
import {
  filterPermissions,
  groupPermissionsByModule,
  permissionMatchesQuery,
  resolvePermissionsByName,
} from './permissionCatalog';

const sample: readonly AdminPermission[] = [
  {
    id: '1',
    name: 'ta.adminPanel.access',
    descriptionEn: 'Access admin',
    descriptionRu: 'Доступ к админке',
    module: 'ta',
  },
  {
    id: '2',
    name: 'tpg.editor.view',
    descriptionEn: 'View editor',
    descriptionRu: 'Просмотр редактора',
    module: 'tpg',
  },
  {
    id: '3',
    name: 'tpg.editor.edit',
    descriptionEn: 'Edit projects',
    descriptionRu: 'Правка проектов',
    module: 'tpg',
  },
];

describe('permissionCatalog helpers', () => {
  it('filters by name, module, or description', () => {
    expect(filterPermissions(sample, 'adminPanel').map((item) => item.id)).toEqual(['1']);
    expect(filterPermissions(sample, 'tpg').map((item) => item.id)).toEqual(['2', '3']);
    expect(filterPermissions(sample, 'админке').map((item) => item.id)).toEqual(['1']);
    expect(permissionMatchesQuery(sample[0]!, '  ACCESS  ')).toBe(true);
  });

  it('groups modules alphabetically', () => {
    expect(groupPermissionsByModule(sample).map((bucket) => bucket.module)).toEqual([
      'ta',
      'tpg',
    ]);
    expect(groupPermissionsByModule(sample)[1]?.permissions).toHaveLength(2);
  });

  it('resolves effective names against the catalog', () => {
    const resolved = resolvePermissionsByName(
      ['tpg.editor.view', 'custom.unknown'],
      sample,
    );
    expect(resolved[0]?.id).toBe('2');
    expect(resolved[1]?.module).toBe('custom');
    expect(resolved[1]?.id).toBe('synthetic:custom.unknown');
  });
});
