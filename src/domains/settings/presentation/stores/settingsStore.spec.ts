import { beforeEach, describe, expect, it } from 'vitest';

import { persistedSettings, useSettingsStore } from './settingsStore';

const DEFAULTS = {
  themeMode: 'system' as const,
  reduceMotion: false,
};

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...DEFAULTS });
  });

  it('persists theme and reduce-motion settings', () => {
    useSettingsStore.getState().setReduceMotion(true);
    useSettingsStore.getState().setThemeMode('dark');

    expect(persistedSettings(useSettingsStore.getState())).toEqual({
      themeMode: 'dark',
      reduceMotion: true,
    });
  });

  it('hydrates persisted values', () => {
    useSettingsStore.getState().hydrate({
      themeMode: 'light',
      reduceMotion: true,
    });

    const state = useSettingsStore.getState();
    expect(state.themeMode).toBe('light');
    expect(state.reduceMotion).toBe(true);
  });
});
