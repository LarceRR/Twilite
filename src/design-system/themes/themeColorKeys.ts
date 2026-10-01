import type { ThemeColors } from '../colors/themes';

/** Stable order of UI semantic tokens in theme packs. */
export const THEME_COLOR_KEYS = [
  'surface',
  'surfaceRaised',
  'surfaceSunken',
  'surfaceDivider',
  'surfaceOverlay',
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'textInverted',
  'accent',
  'accentSoft',
  'accentPressed',
  'accentOn',
  'secondary',
  'secondarySoft',
  'tertiary',
  'tertiarySoft',
  'positive',
  'negative',
  'warning',
  'glassTint',
  'glassRim',
  'glassRimAndroid',
  'glassFillAndroid',
  'controlActive',
  'controlInactive',
  'controlTrack',
  'scrim',
  'skeleton',
  'focusRing',
] as const satisfies ReadonlyArray<keyof ThemeColors>;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

export const MIN_SKY_STOPS = 2;
export const MAX_SKY_STOPS = 5;
