import { Ionicons } from '@expo/vector-icons';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import type { IconName } from '@/design-system/icons/icons';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';

import { useHoldRepeat } from './useHoldRepeat';

type GlassIconButtonProps = {
  readonly accessibilityLabel: string;
  readonly icon?: IconName;
  readonly label?: string;
  readonly flex?: boolean;
  /** Hold-to-accelerate stepper (default). */
  readonly onStep?: (delta: number) => void;
  /** Single tap action (axis cycle, etc.). */
  readonly onPress?: () => void;
};

/**
 * Native Liquid Glass on iOS 26+ via `GlassSurface` / `expo-glass-effect`.
 * Android uses the design-system translucent glass fill fallback.
 */
export function GlassIconButton({
  accessibilityLabel,
  icon,
  label,
  flex = true,
  onStep,
  onPress,
}: GlassIconButtonProps): ReactElement {
  const theme = useThemeColors();
  const hold = useHoldRepeat(onStep ?? (() => undefined));

  const content: ReactNode =
    label !== undefined ? (
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
    ) : (
      <Ionicons name={icon!} size={22} color={theme.textPrimary} />
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      onPressIn={onStep ? hold.onPressIn : undefined}
      onPressOut={onStep ? hold.onPressOut : undefined}
      style={flex ? styles.flex : undefined}
    >
      <GlassSurface cornerRadius={radius.md} interactive style={styles.surface}>
        <View style={styles.inner}>{content}</View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  surface: {
    minHeight: layout.controlHeightCompact,
    width: '100%',
  },
  inner: {
    minHeight: layout.controlHeightCompact,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
