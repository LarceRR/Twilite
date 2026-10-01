import type { ThemeColors } from '../colors/themes';

export type AppThemePack = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly authorDisplayName: string;
  readonly createdAt: string;
  readonly colors: ThemeColors;
  /** Vertical sky gradient stops, top → bottom. Length 2–5. */
  readonly sceneBackgroundColors: readonly string[];
};

export type AppThemePackInput = {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly description?: unknown;
  readonly authorDisplayName?: unknown;
  readonly createdAt?: unknown;
  readonly colors?: unknown;
  readonly sceneBackgroundColors?: unknown;
};
