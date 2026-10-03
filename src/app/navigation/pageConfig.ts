/**
 * Russian titles for every app route.
 * Dynamic segments use Expo-style `[param]` keys.
 */
export type PageConfigEntry = {
  readonly title: string;
};

export const PAGE_CONFIG: Readonly<Record<string, PageConfigEntry>> = {
  '/': { title: 'Поле' },
  '/timeline': { title: 'История' },
  '/ai': { title: 'AI' },
  '/profile': { title: 'Профиль' },
  '/create': { title: 'Добавить' },
  '/settings': { title: 'Настройки' },
  '/settings/scene': { title: 'Сцена' },
  '/theme-catalog': { title: 'Каталог тем' },
  '/theme-catalog/[id]': { title: 'Тема' },
  '/devices': { title: 'Устройства' },
  '/devices/[sessionId]': { title: 'Сессия' },
  '/billing': { title: 'Доступ' },
  '/admin': { title: 'Админ-панель' },
  '/admin/users': { title: 'Пользователи' },
  '/admin/users/[id]': { title: 'Пользователь' },
  '/admin/groups': { title: 'Группы' },
  '/admin/groups/[id]': { title: 'Группа' },
  '/admin/permissions': { title: 'Права' },
  '/qr-scan': { title: 'Сканер QR' },
  '/qr-confirm': { title: 'Подтверждение входа' },
  '/sign-in': { title: 'Вход' },
  '/sign-up': { title: 'Регистрация' },
};

const TAB_ROOT_HREFS = new Set(['/', '/timeline', '/ai', '/profile']);

export function normalizePathname(pathname: string): string {
  if (pathname.length === 0) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function isTabRootPath(pathname: string): boolean {
  return TAB_ROOT_HREFS.has(normalizePathname(pathname));
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith('[') && segment.endsWith(']');
}

function patternMatchesPath(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every(
    (segment, index) => isDynamicSegment(segment) || segment === pathParts[index],
  );
}

/** Longest / most specific config key that matches the pathname. */
export function resolvePageConfig(pathname: string): PageConfigEntry | null {
  const normalized = normalizePathname(pathname);
  const exact = PAGE_CONFIG[normalized];
  if (exact !== undefined) return exact;

  let best: { readonly pattern: string; readonly config: PageConfigEntry } | null = null;
  for (const [pattern, config] of Object.entries(PAGE_CONFIG)) {
    if (!patternIncludesDynamic(pattern)) continue;
    if (!patternMatchesPath(pattern, normalized)) continue;
    if (best === null || pattern.length > best.pattern.length) {
      best = { pattern, config };
    }
  }
  return best?.config ?? null;
}

function patternIncludesDynamic(pattern: string): boolean {
  return pattern.includes('[');
}

export function resolvePageTitle(pathname: string): string | null {
  return resolvePageConfig(pathname)?.title ?? null;
}
