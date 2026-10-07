import { describe, expect, it } from 'vitest';

import {
  isTabRootPath,
  normalizePathname,
  resolvePageConfig,
  resolvePageTitle,
} from './pageConfig';

describe('normalizePathname', () => {
  it('strips a trailing slash except for root', () => {
    expect(normalizePathname('/settings/')).toBe('/settings');
    expect(normalizePathname('/')).toBe('/');
  });
});

describe('resolvePageConfig', () => {
  it('resolves static and dynamic routes', () => {
    expect(resolvePageTitle('/create')).toBe('Создать момент');
    expect(resolvePageTitle('/moment-catalog')).toBe('Каталог моментов');
    expect(resolvePageTitle('/moment-filters')).toBe('Фильтры');
    expect(resolvePageTitle('/settings')).toBe('Настройки');
    expect(resolvePageTitle('/settings/scene')).toBe('Сцена');
    expect(resolvePageConfig('/admin/users/abc-1')?.title).toBe('Пользователь');
    expect(resolvePageConfig('/theme-catalog/pack-9')?.title).toBe('Тема');
  });

  it('returns null for unknown paths', () => {
    expect(resolvePageConfig('/unknown-route')).toBeNull();
  });
});

describe('isTabRootPath', () => {
  it('recognises main tab roots', () => {
    expect(isTabRootPath('/profile')).toBe(true);
    expect(isTabRootPath('/settings')).toBe(false);
  });
});
