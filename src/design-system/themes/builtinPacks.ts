import { darkTheme, lightTheme } from '../colors/themes';
import type { AppThemePack } from './types';

export const LIGHT_THEME_PACK: AppThemePack = {
  id: 'light',
  name: 'Светлая',
  description: 'Тёплая светлая тема Twilite с ясным дневным небом.',
  authorDisplayName: 'Twilite',
  createdAt: '2026-01-01T00:00:00.000Z',
  colors: lightTheme,
  sceneBackgroundColors: ['#8EB7E8', '#C5D9F2', '#F7F4ED'],
};

export const DARK_THEME_PACK: AppThemePack = {
  id: 'dark',
  name: 'Тёмная',
  description: 'Глубокая тёмная тема Twilite с ночным небом.',
  authorDisplayName: 'Twilite',
  createdAt: '2026-01-01T00:00:00.000Z',
  colors: darkTheme,
  sceneBackgroundColors: ['#070B18', '#10131F', '#1A1720'],
};

export const BUILTIN_THEME_PACKS: readonly AppThemePack[] = [LIGHT_THEME_PACK, DARK_THEME_PACK];

export function builtinPackById(id: string): AppThemePack | null {
  return BUILTIN_THEME_PACKS.find((pack) => pack.id === id) ?? null;
}
