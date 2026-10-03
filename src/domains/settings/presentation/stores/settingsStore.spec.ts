import { beforeEach, describe, expect, it } from 'vitest';

import { persistedSettings, useSettingsStore } from './settingsStore';

const DEFAULTS = {
  themeMode: 'system' as const,
  reduceMotion: false,
  developerCameraControlsEnabled: false,
  developerShowActiveCells: true,
  developerShowWorldAxes: true,
  developerShowCellLabels: true,
  developerShowActiveCellCenters: true,
};

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...DEFAULTS });
  });

  it('persists theme, reduce-motion, and developer scene flags', () => {
    useSettingsStore.getState().setReduceMotion(true);
    useSettingsStore.getState().setThemeMode('dark');
    useSettingsStore.getState().setDeveloperCameraControlsEnabled(true);
    useSettingsStore.getState().setDeveloperShowActiveCells(false);
    useSettingsStore.getState().setDeveloperShowWorldAxes(false);
    useSettingsStore.getState().setDeveloperShowCellLabels(false);
    useSettingsStore.getState().setDeveloperShowActiveCellCenters(false);

    expect(persistedSettings(useSettingsStore.getState())).toEqual({
      themeMode: 'dark',
      reduceMotion: true,
      developerCameraControlsEnabled: true,
      developerShowActiveCells: false,
      developerShowWorldAxes: false,
      developerShowCellLabels: false,
      developerShowActiveCellCenters: false,
    });
  });

  it('hydrates persisted values', () => {
    useSettingsStore.getState().hydrate({
      themeMode: 'light',
      reduceMotion: true,
      developerCameraControlsEnabled: true,
      developerShowActiveCells: false,
      developerShowWorldAxes: false,
      developerShowCellLabels: false,
      developerShowActiveCellCenters: false,
    });

    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('light');
    expect(state.reduceMotion).toBe(true);
    expect(state.developerCameraControlsEnabled).toBe(true);
    expect(state.developerShowActiveCells).toBe(false);
    expect(state.developerShowWorldAxes).toBe(false);
    expect(state.developerShowCellLabels).toBe(false);
    expect(state.developerShowActiveCellCenters).toBe(false);
  });

  it('keeps scene defaults when hydrate omits them', () => {
    useSettingsStore.getState().hydrate({
      themeMode: 'dark',
      reduceMotion: false,
      developerCameraControlsEnabled: false,
    });

    const state = useSettingsStore.getState();
    expect(state.developerShowActiveCells).toBe(true);
    expect(state.developerShowWorldAxes).toBe(true);
    expect(state.developerShowCellLabels).toBe(true);
    expect(state.developerShowActiveCellCenters).toBe(true);
  });
});
