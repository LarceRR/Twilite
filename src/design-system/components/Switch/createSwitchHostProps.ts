export type SwitchHostProps = {
  readonly seedColor: string;
  readonly colorScheme: 'light' | 'dark';
};

/**
 * Maps app theme tokens onto `@expo/ui` Host props.
 * `seedColor` becomes SwiftUI tint on iOS and a Material 3 palette on Android.
 */
export function createSwitchHostProps(input: {
  readonly accent: string;
  readonly isDark: boolean;
}): SwitchHostProps {
  return {
    seedColor: input.accent,
    colorScheme: input.isDark ? 'dark' : 'light',
  };
}
