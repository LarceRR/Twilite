import { describe, expect, it } from 'vitest';

import { CREATE_TAB_NAME, isMainTabRoute, TAB_ROUTES } from './tabRoutes';

describe('tabRoutes', () => {
  it('keeps create outside the main pill routes', () => {
    expect(TAB_ROUTES.every((route) => (route.name as string) !== CREATE_TAB_NAME)).toBe(true);
    expect(isMainTabRoute('profile')).toBe(true);
    expect(isMainTabRoute(CREATE_TAB_NAME)).toBe(false);
  });
});
