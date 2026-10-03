import { create } from 'zustand';
import { type ThemeMode, useThemeStore } from '@/design-system/colors/colors';

export type SettingsState = {
  themeMode: ThemeMode;
  reduceMotion: boolean;
  developerCameraControlsEnabled: boolean;
  developerShowActiveCells: boolean;
  developerShowWorldAxes: boolean;
  developerShowCellLabels: boolean;
  developerShowActiveCellCenters: boolean;
  setThemeMode: (v: ThemeMode) => void;
  setReduceMotion: (v: boolean) => void;
  setDeveloperCameraControlsEnabled: (v: boolean) => void;
  setDeveloperShowActiveCells: (v: boolean) => void;
  setDeveloperShowWorldAxes: (v: boolean) => void;
  setDeveloperShowCellLabels: (v: boolean) => void;
  setDeveloperShowActiveCellCenters: (v: boolean) => void;
  hydrate: (v: Partial<PersistedSettings>) => void;
};

export type PersistedSettings = {
  readonly themeMode: ThemeMode;
  readonly reduceMotion: boolean;
  readonly developerCameraControlsEnabled: boolean;
  readonly developerShowActiveCells: boolean;
  readonly developerShowWorldAxes: boolean;
  readonly developerShowCellLabels: boolean;
  readonly developerShowActiveCellCenters: boolean;
};

function publishThemeMode(mode: ThemeMode): void {
  useThemeStore.getState().setMode(mode);
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  themeMode: 'system',
  reduceMotion: false,
  developerCameraControlsEnabled: false,
  developerShowActiveCells: true,
  developerShowWorldAxes: true,
  developerShowCellLabels: true,
  developerShowActiveCellCenters: true,
  setThemeMode: (themeMode) => {
    publishThemeMode(themeMode);
    set({ themeMode });
  },
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setDeveloperCameraControlsEnabled: (developerCameraControlsEnabled) =>
    set({ developerCameraControlsEnabled }),
  setDeveloperShowActiveCells: (developerShowActiveCells) =>
    set({ developerShowActiveCells }),
  setDeveloperShowWorldAxes: (developerShowWorldAxes) =>
    set({ developerShowWorldAxes }),
  setDeveloperShowCellLabels: (developerShowCellLabels) =>
    set({ developerShowCellLabels }),
  setDeveloperShowActiveCellCenters: (developerShowActiveCellCenters) =>
    set({ developerShowActiveCellCenters }),
  hydrate: (v) => {
    const next: Partial<SettingsState> = {};
    if (v.themeMode !== undefined) {
      next.themeMode = v.themeMode;
      publishThemeMode(v.themeMode);
    }
    if (v.reduceMotion !== undefined) next.reduceMotion = v.reduceMotion;
    if (v.developerCameraControlsEnabled !== undefined) {
      next.developerCameraControlsEnabled = v.developerCameraControlsEnabled;
    }
    if (v.developerShowActiveCells !== undefined) {
      next.developerShowActiveCells = v.developerShowActiveCells;
    }
    if (v.developerShowWorldAxes !== undefined) {
      next.developerShowWorldAxes = v.developerShowWorldAxes;
    }
    if (v.developerShowCellLabels !== undefined) {
      next.developerShowCellLabels = v.developerShowCellLabels;
    }
    if (v.developerShowActiveCellCenters !== undefined) {
      next.developerShowActiveCellCenters = v.developerShowActiveCellCenters;
    }
    set(next);
  },
}));

export function persistedSettings(s: SettingsState): PersistedSettings {
  return {
    themeMode: s.themeMode,
    reduceMotion: s.reduceMotion,
    developerCameraControlsEnabled: s.developerCameraControlsEnabled,
    developerShowActiveCells: s.developerShowActiveCells,
    developerShowWorldAxes: s.developerShowWorldAxes,
    developerShowCellLabels: s.developerShowCellLabels,
    developerShowActiveCellCenters: s.developerShowActiveCellCenters,
  };
}

export const selectThemeMode = (s: SettingsState): ThemeMode => s.themeMode;
