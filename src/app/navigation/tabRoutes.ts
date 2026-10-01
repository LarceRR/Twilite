import type { IconName } from '@/design-system/icons/icons';
import { icons } from '@/design-system/icons/icons';

export type TabRouteName = 'index' | 'timeline' | 'ai' | 'profile';

/** Trailing Liquid Glass control (iOS `role="search"` / Android separate FAB). */
export const CREATE_TAB_NAME = 'create' as const;

export type TabGlyphs = { readonly active: IconName; readonly inactive: IconName };

export type NativeTabSymbols = { readonly active: string; readonly inactive: string };

export type TabRouteConfig = {
  readonly name: TabRouteName;
  readonly title: string;
  readonly glyphs: TabGlyphs;
  /** Native iOS symbols avoid raster-image tint and sizing inconsistencies. */
  readonly nativeSymbols: NativeTabSymbols;
};

export const TAB_ROUTES: readonly TabRouteConfig[] = [
  {
    name: 'index',
    title: 'Поле',
    glyphs: { active: icons.spaceActive, inactive: icons.space },
    nativeSymbols: { inactive: 'circle.grid.2x2', active: 'circle.grid.2x2.fill' },
  },
  {
    name: 'timeline',
    title: 'История',
    glyphs: { active: icons.timelineActive, inactive: icons.timeline },
    nativeSymbols: { inactive: 'clock', active: 'clock.fill' },
  },
  {
    name: 'ai',
    title: 'AI',
    glyphs: { active: icons.aiActive, inactive: icons.ai },
    nativeSymbols: { inactive: 'sparkles', active: 'sparkles' },
  },
  {
    name: 'profile',
    title: 'Профиль',
    glyphs: { active: icons.profileActive, inactive: icons.profile },
    nativeSymbols: { inactive: 'person', active: 'person.fill' },
  },
];

const TAB_ICONS = Object.fromEntries(
  TAB_ROUTES.map((route) => [route.name, route.glyphs]),
) as Readonly<Record<string, TabGlyphs>>;

const FALLBACK_GLYPHS: TabGlyphs = { active: 'ellipse', inactive: 'ellipse-outline' };

export function getTabGlyphs(routeName: string): TabGlyphs {
  return TAB_ICONS[routeName] ?? FALLBACK_GLYPHS;
}

export function isMainTabRoute(routeName: string): boolean {
  return TAB_ROUTES.some((route) => route.name === routeName);
}
