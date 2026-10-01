import { memo, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { ThemeColors } from '../../colors/themes';
import { useThemeColors } from '../../colors/themeStore';
import { radius } from '../../radius/radius';
import { shadows } from '../../shadows/shadows';
import { layout, spacing } from '../../spacing/spacing';
import { usePressFeedback } from '../Pressable/usePressFeedback';
import { Text } from '../Text/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly compact?: boolean;
  readonly accessibilityHint?: string;
  readonly testID?: string;
};

function backgroundFor(variant: ButtonVariant, theme: ThemeColors): string {
  switch (variant) {
    case 'primary':
      return theme.accent;
    case 'secondary':
      return theme.surfaceSunken;
    case 'danger':
      return theme.negative;
    default:
      return 'transparent';
  }
}

function labelColorFor(variant: ButtonVariant, theme: ThemeColors): string {
  switch (variant) {
    case 'primary':
      return theme.accentOn;
    case 'danger':
      return theme.accentOn;
    default:
      return theme.textPrimary;
  }
}

function ButtonComponent({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  accessibilityHint,
  testID,
}: ButtonProps): ReactElement {
  const feedback = usePressFeedback();
  const theme = useThemeColors();
  const inactive = disabled || loading;
  const labelColor = labelColorFor(variant, theme);

  return (
    <Animated.View style={feedback.animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
        {...(testID === undefined ? {} : { testID })}
        disabled={inactive}
        hitSlop={layout.hitSlop}
        onPress={onPress}
        onPressIn={feedback.onPressIn}
        onPressOut={feedback.onPressOut}
        style={[
          styles.base,
          compact ? styles.compact : styles.regular,
          { backgroundColor: backgroundFor(variant, theme) },
          variant === 'secondary' && {
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.surfaceDivider,
          },
          variant === 'primary' && shadows.low,
          inactive && styles.inactive,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} size="small" />
        ) : (
          <View style={styles.labelWrap}>
            <Text variant="label" color={labelColor} numberOfLines={1}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const Button = memo(ButtonComponent);

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
  },
  regular: {
    minHeight: layout.controlHeight,
  },
  compact: {
    minHeight: layout.controlHeightCompact,
    paddingHorizontal: spacing.lg,
  },
  inactive: {
    opacity: 0.45,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
