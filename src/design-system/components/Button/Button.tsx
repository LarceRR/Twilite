import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from '../../colors/themeStore';
import type { IconName } from '../../icons/icons';
import { radius } from '../../radius/radius';
import { layout, spacing } from '../../spacing/spacing';
import { usePressFeedback } from '../Pressable/usePressFeedback';
import {
  GlassSurface,
  LIQUID_GLASS_AVAILABLE,
} from '../GlassSurface/GlassSurface';
import { Text } from '../Text/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** The shared glass button keeps native Pressable callbacks available to callers. */
export type ButtonProps = Omit<
  PressableProps,
  | 'children'
  | 'style'
  | 'onPress'
  | 'onPressIn'
  | 'onPressOut'
  | 'accessibilityRole'
  | 'accessibilityState'
> & {
  readonly label: string;
  readonly onPress: NonNullable<PressableProps['onPress']>;
  readonly onPressIn?: PressableProps['onPressIn'];
  readonly onPressOut?: PressableProps['onPressOut'];
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly compact?: boolean;
  /** Stretch the button to the width of its parent. */
  readonly block?: boolean;
  readonly icon?: IconName;
  /** Style for the button container without overriding its native event handling. */
  readonly containerStyle?: StyleProp<ViewStyle>;
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
  if (Platform.OS === 'ios' && !LIQUID_GLASS_AVAILABLE) {
    if (variant === 'danger') return theme.negative;
    return theme.textPrimary;
  }

  switch (variant) {
    case 'primary':
    case 'danger':
      return theme.accentOn;
    default:
      return theme.textPrimary;
  }
}

/**
 * iOS 26+ uses system Liquid Glass, older iOS uses the themed blur fallback,
 * and Android uses its own themed surface fill.
 */
function ButtonComponent({
  label,
  onPress,
  onPressIn,
  onPressOut,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  block = false,
  icon,
  hitSlop = layout.hitSlop,
  containerStyle,
  ...pressableProps
}: ButtonProps): ReactElement {
  const feedback = usePressFeedback();
  const theme = useThemeColors();
  const inactive = disabled || loading;
  const labelColor = labelColorFor(variant, theme);

  return (
    <Animated.View style={[feedback.animatedStyle, block && styles.block, containerStyle]}>
      <Pressable
        {...pressableProps}
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        hitSlop={hitSlop}
        onPress={onPress}
        onPressIn={(event) => {
          feedback.onPressIn();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          feedback.onPressOut();
          onPressOut?.(event);
        }}
        style={inactive ? styles.inactive : undefined}
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
