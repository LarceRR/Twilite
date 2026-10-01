import { colorRamps } from './palette';
import { lightScene, lightTheme } from './themes';

export { alpha, colorRamps, legacyPalette, withAlpha } from './palette';
export type { ColorScheme, SceneColors, ThemeColors } from './themes';
export { darkScene, darkTheme, lightScene, lightTheme, sceneThemes, themes } from './themes';
export type { ThemeMode } from './themeStore';
export {
  applyBuiltinThemeId,
  currentSceneColors,
  currentSceneSkyColors,
  currentScheme,
  currentThemeColors,
  currentThemePack,
  resolveActivePack,
  resolveScheme,
  THEME_MODES,
  useColorSchemeToken,
  useIsDarkTheme,
  useSceneColors,
  useSceneSkyColors,
  useSystemColorSchemeSync,
  useThemeColors,
  useThemeMode,
  useThemePack,
  useThemeStore,
} from './themeStore';

/**
 * Raw ramps, old names included.
 *
 * @deprecated Prefer `useThemeColors()` for anything a user can see.
 */
export const palette = colorRamps;

/**
 * @deprecated Always light tokens — use `useThemeColors()` or `currentThemeColors()`.
 */
export const colors = lightTheme;

/**
 * @deprecated Use `useSceneColors()` / `currentSceneColors()`.
 */
export const sceneColors = lightScene;
