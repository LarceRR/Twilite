import { create } from 'zustand';
import { type ThemeMode, useThemeStore } from '@/design-system/colors/colors';
export type GridShape = 'square' | 'round';
export type GridVisibility = 'on' | 'off';
export type SettingsState = {
  themeMode: ThemeMode;
  reduceMotion: boolean;
  showPerformanceOverlay: boolean;
  cameraControlEnabled: boolean;
  showHitbox: boolean;
  manualHitbox: boolean;
  hitboxWidthPx: number;
  hitboxHeightPx: number;
  gridVisibility: GridVisibility;
  gridShape: GridShape;
  gridObjectsOnly: boolean;
  surfaceBackground: string | null;
  highlightEndpoints: boolean;
  setThemeMode: (v: ThemeMode) => void;
  setReduceMotion: (v: boolean) => void;
  setShowPerformanceOverlay: (v: boolean) => void;
  setCameraControlEnabled: (v: boolean) => void;
  setShowHitbox: (v: boolean) => void;
  setManualHitbox: (v: boolean) => void;
  setHitboxWidthPx: (v: number) => void;
  setHitboxHeightPx: (v: number) => void;
  setGridVisibility: (v: GridVisibility) => void;
  setGridShape: (v: GridShape) => void;
  setGridObjectsOnly: (v: boolean) => void;
  setSurfaceBackground: (v: string | null) => void;
  setHighlightEndpoints: (v: boolean) => void;
  hydrate: (v: Partial<PersistedSettings>) => void;
};
export type PersistedSettings = {
  readonly themeMode: ThemeMode;
  readonly reduceMotion: boolean;
  readonly showPerformanceOverlay: boolean;
  readonly cameraControlEnabled?: boolean;
  readonly showHitbox: boolean;
  readonly manualHitbox?: boolean;
  readonly hitboxWidthPx?: number;
  readonly hitboxHeightPx?: number;
  readonly gridVisibility?: GridVisibility;
  readonly gridShape?: GridShape;
  readonly gridObjectsOnly?: boolean;
  readonly surfaceBackground: string | null;
  readonly highlightEndpoints: boolean;
};
function publishThemeMode(mode: ThemeMode): void {
  useThemeStore.getState().setMode(mode);
}
export const useSettingsStore = create<SettingsState>()((set) => ({
  themeMode: 'system',
  reduceMotion: false,
  showPerformanceOverlay: false,
  cameraControlEnabled: false,
  showHitbox: false,
  manualHitbox: false,
  hitboxWidthPx: 84,
  hitboxHeightPx: 120,
  gridVisibility: 'on',
  gridShape: 'square',
  gridObjectsOnly: false,
  surfaceBackground: null,
  highlightEndpoints: false,
  setThemeMode: (themeMode) => {
    publishThemeMode(themeMode);
    set({ themeMode });
  },
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setShowPerformanceOverlay: (showPerformanceOverlay) => set({ showPerformanceOverlay }),
  setCameraControlEnabled: (cameraControlEnabled) => set({ cameraControlEnabled }),
  setShowHitbox: (showHitbox) => set({ showHitbox }),
  setManualHitbox: (manualHitbox) => set({ manualHitbox }),
  setHitboxWidthPx: (v) => set({ hitboxWidthPx: Math.max(8, v) }),
  setHitboxHeightPx: (v) => set({ hitboxHeightPx: Math.max(8, v) }),
  setGridVisibility: (gridVisibility) => set({ gridVisibility }),
  setGridShape: (gridShape) => set({ gridShape }),
  setGridObjectsOnly: (gridObjectsOnly) => set({ gridObjectsOnly }),
  setSurfaceBackground: (surfaceBackground) => set({ surfaceBackground }),
  setHighlightEndpoints: (highlightEndpoints) => set({ highlightEndpoints }),
  hydrate: (v) => {
    const next: Partial<SettingsState> = {};
    if (v.themeMode !== undefined) {
      next.themeMode = v.themeMode;
      publishThemeMode(v.themeMode);
    }
    if (v.reduceMotion !== undefined) next.reduceMotion = v.reduceMotion;
    if (v.showPerformanceOverlay !== undefined)
      next.showPerformanceOverlay = v.showPerformanceOverlay;
    if (v.cameraControlEnabled !== undefined)
      next.cameraControlEnabled = v.cameraControlEnabled;
    if (v.showHitbox !== undefined) next.showHitbox = v.showHitbox;
    if (v.manualHitbox !== undefined) next.manualHitbox = v.manualHitbox;
    if (v.hitboxWidthPx !== undefined) next.hitboxWidthPx = Math.max(8, v.hitboxWidthPx);
    if (v.hitboxHeightPx !== undefined) next.hitboxHeightPx = Math.max(8, v.hitboxHeightPx);
    if (v.gridVisibility !== undefined) next.gridVisibility = v.gridVisibility;
    if (v.gridShape !== undefined) next.gridShape = v.gridShape;
    if (v.gridObjectsOnly !== undefined) next.gridObjectsOnly = v.gridObjectsOnly;
    if (v.surfaceBackground !== undefined) next.surfaceBackground = v.surfaceBackground;
    if (v.highlightEndpoints !== undefined) next.highlightEndpoints = v.highlightEndpoints;
    set(next);
  },
}));
export function persistedSettings(s: SettingsState): PersistedSettings {
  return {
    themeMode: s.themeMode,
    reduceMotion: s.reduceMotion,
    showPerformanceOverlay: s.showPerformanceOverlay,
    cameraControlEnabled: s.cameraControlEnabled,
    showHitbox: s.showHitbox,
    manualHitbox: s.manualHitbox,
    hitboxWidthPx: s.hitboxWidthPx,
    hitboxHeightPx: s.hitboxHeightPx,
    gridVisibility: s.gridVisibility,
    gridShape: s.gridShape,
    gridObjectsOnly: s.gridObjectsOnly,
    surfaceBackground: s.surfaceBackground,
    highlightEndpoints: s.highlightEndpoints,
  };
}
export const selectThemeMode = (s: SettingsState): ThemeMode => s.themeMode;
export const selectSurfaceBackground = (s: SettingsState): string | null => s.surfaceBackground;
export const selectHighlightEndpoints = (s: SettingsState): boolean => s.highlightEndpoints;
export const selectShowHitbox = (s: SettingsState): boolean => s.showHitbox;
export const selectManualHitbox = (s: SettingsState): boolean => s.manualHitbox;
