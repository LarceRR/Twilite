import { describe, expect, it } from 'vitest';

import { isMainTabRoute, TAB_ROUTES } from './tabRoutes';

describe('tabRoutes', () => {
  it('exposes the main destinations in their configured order', () => {
    expect(TAB_ROUTES.map((route) => route.name)).toEqual(['index', 'timeline', 'ai', 'profile']);
    expect(isMainTabRoute('index')).toBe(true);
    expect(isMainTabRoute('profile')).toBe(true);
    expect(isMainTabRoute('missing')).toBe(false);
  });
});
