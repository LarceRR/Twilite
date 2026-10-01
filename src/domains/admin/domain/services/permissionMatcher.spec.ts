import { describe, expect, it } from 'vitest';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  matchesPermission,
} from './permissionMatcher';

describe('matchesPermission', () => {
  it('matches exact permission', () => {
    expect(matchesPermission('twilite.users.view', 'twilite.users.view')).toBe(true);
  });

  it('rejects different action', () => {
    expect(matchesPermission('twilite.users.view', 'twilite.users.edit')).toBe(false);
  });

  it('matches suffix wildcard', () => {
    expect(matchesPermission('twilite.auth.*', 'twilite.auth.login')).toBe(true);
    expect(matchesPermission('twilite.auth.*', 'twilite.auth.sessions.view')).toBe(true);
    expect(matchesPermission('tpg.editor.*', 'tpg.editor.createProject')).toBe(true);
  });

  it('does not match different module with wildcard', () => {
    expect(matchesPermission('twilite.auth.*', 'twilite.users.view')).toBe(false);
  });

  it('treats lone * as all permissions', () => {
    expect(matchesPermission('*', 'ta.adminPanel.access')).toBe(true);
    expect(matchesPermission('*', 'a.b.c.d')).toBe(true);
  });

  it('requires full segment prefix before wildcard', () => {
    expect(matchesPermission('twilite.*', 'twilite.users.view')).toBe(true);
    expect(matchesPermission('twilite.users.*', 'twilite.auth.login')).toBe(false);
  });
});

describe('hasPermission helpers', () => {
  const effective = ['twilite.auth.*', 'tpg.editor.view', 'twilite.users.edit'];

  it('hasPermission via wildcard', () => {
    expect(hasPermission(effective, 'twilite.auth.logout')).toBe(true);
    expect(hasPermission(effective, 'ta.adminPanel.access')).toBe(false);
  });

  it('hasAllPermissions', () => {
    expect(hasAllPermissions(effective, ['twilite.auth.login', 'tpg.editor.view'])).toBe(true);
    expect(hasAllPermissions(effective, ['twilite.auth.login', 'twilite.users.delete'])).toBe(
      false,
    );
  });

  it('hasAnyPermission', () => {
    expect(hasAnyPermission(effective, ['ta.adminPanel.access', 'tpg.editor.view'])).toBe(true);
    expect(hasAnyPermission(effective, ['ta.adminPanel.access', 'tpg.editor.delete'])).toBe(false);
  });
});
