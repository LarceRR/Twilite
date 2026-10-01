import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import {
  builtinPackById,
  DARK_THEME_PACK,
  isDarkPack,
  LIGHT_THEME_PACK,
  type AppThemePack,
} from '../themes';
import {
  type ColorScheme,
  type SceneColors,
  sceneThemes,
  type ThemeColors,
} from './themes';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

function systemScheme(): ColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function builtinForScheme(scheme: ColorScheme): AppThemePack {
  return scheme === 'dark' ? DARK_THEME_PACK : LIGHT_THEME_PACK;
}

export function resolveScheme(mode: ThemeMode, scheme: ColorScheme): ColorScheme {
  return mode === 'system' ? scheme : mode;
}

export function resolveActivePack(
  mode: ThemeMode,
  systemScheme: ColorScheme,
  overridePack: AppThemePack | null,
): AppThemePack {
  if (overridePack !== null) {
    return overridePack;
  }

  return builtinForScheme(resolveScheme(mode, systemScheme));
}

type ThemeState = {
  /** Built-in preference when no catalog override is applied. */
  readonly mode: ThemeMode;
  readonly systemScheme: ColorScheme;
  /** Catalog / custom pack; null means follow mode + system. */
  readonly overridePack: AppThemePack | null;
  setMode: (mode: ThemeMode) => void;
  setSystemScheme: (scheme: ColorScheme) => void;
  applyPack: (pack: AppThemePack) => void;
  clearOverridePack: () => void;
};

/**
 * Lives in the design system on purpose: every visual primitive needs it, and
 * nothing here may depend on a domain. Persisted mode / applied pack id are
 * owned by settings + themes domain; this store only holds the live paint state.
 */
export const useThemeStore = create<ThemeState>()((set) => ({
  mode: 'system',
  systemScheme: systemScheme(),
  overridePack: null,
  setMode: (mode) => set({ mode, overridePack: null }),
  setSystemScheme: (scheme) => set({ systemScheme: scheme }),
  applyPack: (pack) => set({ overridePack: pack }),
  clearOverridePack: () => set({ overridePack: null }),
}));

function selectPack(state: ThemeState): AppThemePack {
  return resolveActivePack(state.mode, state.systemScheme, state.overridePack);
}

const selectScheme = (state: ThemeState): ColorScheme => {
  const pack = selectPack(state);
  if (state.overridePack !== null) {
    return isDarkPack(pack) ? 'dark' : 'light';
  }
  return resolveScheme(state.mode, state.systemScheme);
};

export function currentScheme(): ColorScheme {
  return selectScheme(useThemeStore.getState());
}

export function currentThemePack(): AppThemePack {
  return selectPack(useThemeStore.getState());
}

export function currentThemeColors(): ThemeColors {
  return currentThemePack().colors;
}

export function currentSceneColors(): SceneColors {
  return sceneThemes[currentScheme()];
}

export function currentSceneSkyColors(): readonly string[] {
  return currentThemePack().sceneBackgroundColors;
}

export function useColorSchemeToken(): ColorScheme {
  return useThemeStore(selectScheme);
}

export function useThemePack(): AppThemePack {
  return useThemeStore(selectPack);
}

export function useThemeColors(): ThemeColors {
  return useThemePack().colors;
}

export function useSceneSkyColors(): readonly string[] {
  return useThemePack().sceneBackgroundColors;
}

export function useSceneColors(): SceneColors {
  return sceneThemes[useColorSchemeToken()];
}

export function useIsDarkTheme(): boolean {
  return isDarkPack(useThemePack());
}

export function useThemeMode(): ThemeMode {
  return useThemeStore((state) => state.mode);
}

export function useSystemColorSchemeSync(): void {
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      useThemeStore.getState().setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    useThemeStore.getState().setSystemScheme(systemScheme());

    return () => subscription.remove();
  }, []);
}

export function applyBuiltinThemeId(id: string): boolean {
  const pack = builtinPackById(id);
  if (pack === null) {
    return false;
  }
  useThemeStore.getState().applyPack(pack);
  return true;
}
