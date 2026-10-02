import type { Theme } from 'expo-router/react-navigation';

import type { ThemeColors } from '@/design-system/colors/colors';

/** Minimal fonts so ThemeProvider is satisfied; native headers are hidden in-app. */
const NAVIGATION_FONTS: Theme['fonts'] = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  bold: { fontFamily: 'System', fontWeight: '600' },
  heavy: { fontFamily: 'System', fontWeight: '700' },
};

/**
 * Maps app theme tokens onto React Navigation's theme.
 * `colors.background` paints the native stack container (iOS swipe-back underlay).
 */
export function createNavigationTheme(colors: ThemeColors, dark: boolean): Theme {
  return {
    dark,
    colors: {
      primary: colors.accent,
      background: colors.surface,
      card: colors.surfaceRaised,
      text: colors.textPrimary,
      border: colors.surfaceDivider,
      notification: colors.negative,
    },
    fonts: NAVIGATION_FONTS,
  };
}
