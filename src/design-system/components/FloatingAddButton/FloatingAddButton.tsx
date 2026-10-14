import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../colors/themeStore';
import { icons } from '../../icons/icons';
import { durations } from '../../motion/durations';
import { reanimatedEasing } from '../../motion/easings';
import { radius } from '../../radius/radius';
import { layout } from '../../spacing/spacing';
import { GlassSurface } from '../GlassSurface/GlassSurface';
import { usePressFeedback } from '../Pressable/usePressFeedback';

export type FloatingAddButtonProps = {
  readonly onPress: () => void;
  readonly expanded: boolean;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly size?: number;
};

/** 40pt keeps the control in the same visual family as the avatars. */
const DEFAULT_SIZE = 40;

/**
 * The single entry point for creating something on the surface.
 *
 * On iOS 26+ this is real system Liquid Glass (`GlassView`). Older iOS versions
 * do not expose that API, so they use the compact themed fallback. Other
 * platforms use the same fallback by design.
 */
function FloatingAddButtonComponent({
  onPress,
  expanded,
  accessibilityLabel,
  disabled = false,
  size = DEFAULT_SIZE,
}: FloatingAddButtonProps): ReactElement {
  const theme = useThemeColors();
  const feedback = usePressFeedback({ scaleTo: 0.92 });
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: durations.fast,
      easing: reanimatedEasing('standard'),
    });
  }, [expanded, progress]);

  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }));

  const glyph = (
    <Animated.View style={glyphStyle}>
      <Ionicons name={icons.add} size={Math.round(size * 0.52)} color={theme.textPrimary} />
    </Animated.View>
  );

  const dimensions = { width: size, height: size, borderRadius: radius.pill };

  const surface = (
    <GlassSurface cornerRadius={radius.pill} interactive style={dimensions}>
      <View style={[styles.center, dimensions]}>{glyph}</View>
    </GlassSurface>
  );

  return (
    <Animated.View style={feedback.animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, expanded }}
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

export const FloatingAddButton = memo(FloatingAddButtonComponent);

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
});
