import { create } from 'zustand';
import { type ThemeMode, useThemeStore } from '@/design-system/colors/colors';

export type SettingsState = {
  themeMode: ThemeMode;
  reduceMotion: boolean;
  setThemeMode: (v: ThemeMode) => void;
  setReduceMotion: (v: boolean) => void;
  hydrate: (v: Partial<PersistedSettings>) => void;
};

export type PersistedSettings = {
  readonly themeMode: ThemeMode;
  readonly reduceMotion: boolean;
};

function publishThemeMode(mode: ThemeMode): void {
  useThemeStore.getState().setMode(mode);
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  themeMode: 'system',
  reduceMotion: false,
  setThemeMode: (themeMode) => {
    publishThemeMode(themeMode);
    set({ themeMode });
  },
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  hydrate: (v) => {
    const next: Partial<SettingsState> = {};
    if (v.themeMode !== undefined) {
      next.themeMode = v.themeMode;
      publishThemeMode(v.themeMode);
    }
    if (v.reduceMotion !== undefined) next.reduceMotion = v.reduceMotion;
    set(next);
  },
}));

export function persistedSettings(s: SettingsState): PersistedSettings {
  return {
    themeMode: s.themeMode,
    reduceMotion: s.reduceMotion,
  };
}

export const selectThemeMode = (s: SettingsState): ThemeMode => s.themeMode;
