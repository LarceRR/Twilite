import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from '../../colors/themeStore';
import { icons, type IconName } from '../../icons/icons';
import { radius } from '../../radius/radius';
import { layout, spacing } from '../../spacing/spacing';
import { usePressFeedback } from '../Pressable/usePressFeedback';
import { GlassSurface } from '../GlassSurface/GlassSurface';
import { Text } from '../Text/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly compact?: boolean;
  /** Stretch the button to the width of its parent. */
  readonly block?: boolean;
  readonly icon?: IconName;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly testID?: string;
};

function tintFor(variant: ButtonVariant, theme: ReturnType<typeof useThemeColors>): string {
  switch (variant) {
    case 'primary':
      return theme.accent;
    case 'secondary':
      return theme.surfaceSunken;
    case 'danger':
      return theme.negative;
    case 'ghost':
      return theme.glassTint;
  }
}

function labelColorFor(variant: ButtonVariant, theme: ReturnType<typeof useThemeColors>): string {
  switch (variant) {
    case 'primary':
    case 'danger':
      return theme.accentOn;
    default:
      return theme.textPrimary;
  }
}

/**
 * Cross-platform action control. iOS 26+ uses native Liquid Glass, older iOS
 * uses themed system blur and Android uses the design-system glass fill.
 */
function ButtonComponent({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  block = false,
  icon,
  accessibilityLabel,
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
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
        {...(testID === undefined ? {} : { testID })}
        disabled={inactive}
        hitSlop={layout.hitSlop}
        onPress={onPress}
        onPressIn={feedback.onPressIn}
        onPressOut={feedback.onPressOut}
        style={[
          block ? styles.block : undefined,
          inactive ? styles.inactive : undefined,
        ]}
      >
        <GlassSurface
          cornerRadius={radius.pill}
          interactive
          tintColor={tintFor(variant, theme)}
          style={[
            styles.surface,
            compact ? styles.compact : styles.regular,
            block && styles.block,
            variant === 'secondary' && {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.surfaceDivider,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={labelColor} size="small" />
          ) : (
            <View style={styles.labelWrap}>
              {icon === undefined ? null : (
                <Ionicons name={icon} size={18} color={labelColor} />
              )}
              <Text variant="label" color={labelColor} numberOfLines={1}>
                {label}
              </Text>
            </View>
          )}
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

export const Button = memo(ButtonComponent);

const styles = StyleSheet.create({
  surface: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
  },
  regular: {
    minHeight: layout.controlHeight,
  },
  compact: {
    minHeight: layout.controlHeightCompact,
    paddingHorizontal: spacing.lg,
  },
  block: {
    width: '100%',
  },
  inactive: {
    opacity: 0.45,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
