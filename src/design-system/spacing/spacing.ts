export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 42,
} as const;

export const layout = {
  screenGutter: spacing.lg,
  tabBarInset: spacing.lg,
  tabBarHeight: 64,
  actionBarHeight: 72,
  controlHeight: 52,
  controlHeightCompact: 40,
  hitSlop: spacing.sm,
  maxContentWidth: 520,
} as const;
