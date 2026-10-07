import { memo, type ReactElement } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { radius } from '../../radius/radius';
import { shadows } from '../../shadows/shadows';
import { layout, spacing } from '../../spacing/spacing';
import { fontFamily, fontWeights } from '../../typography/fonts';
import { GlassSurface, isLiquidGlassSurfaceAvailable } from '../GlassSurface/GlassSurface';
import { usePressFeedback } from '../Pressable/usePressFeedback';
import { Text } from '../Text/Text';

export type GlassTintButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly tintColor: string;
  readonly labelColor: string;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
};

/**
 * Pill CTA with Liquid Glass on iOS 26+ and a tinted fill elsewhere.
 */
function GlassTintButtonComponent({
  label,
  onPress,
  tintColor,
  labelColor,
  disabled = false,
  accessibilityLabel,
}: GlassTintButtonProps): ReactElement {
  const feedback = usePressFeedback({ scaleTo: 0.96 });
  const labelNode = (
    <Text color={labelColor} numberOfLines={1} style={styles.label}>
      {label}
    </Text>
  );

  const surface = isLiquidGlassSurfaceAvailable() ? (
    <GlassSurface
      cornerRadius={radius.pill}
      interactive
      tintColor={tintColor}
      style={styles.surface}
    >
      <View style={styles.inner}>{labelNode}</View>
    </GlassSurface>
  ) : (
    <View
      style={[
        styles.surface,
        styles.inner,
        Platform.OS === 'ios' ? null : shadows.medium,
        {
          backgroundColor: tintColor,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.28)',
        },
      ]}
    >
      {labelNode}
    </View>
  );

  return (
    <Animated.View style={feedback.animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={layout.hitSlop}
        onPress={onPress}
        onPressIn={feedback.onPressIn}
        onPressOut={feedback.onPressOut}
        style={disabled ? styles.disabled : null}
      >
        {surface}
      </Pressable>
    </Animated.View>
  );
}

export const GlassTintButton = memo(GlassTintButtonComponent);

const styles = StyleSheet.create({
  surface: {
    minHeight: layout.controlHeightCompact,
    minWidth: 148,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  inner: {
    minHeight: layout.controlHeightCompact,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: fontFamily('semiBold'),
    fontWeight: fontWeights.semiBold,
    fontSize: 14,
    lineHeight: 16,
  },
  disabled: {
    opacity: 0.4,
  },
});
