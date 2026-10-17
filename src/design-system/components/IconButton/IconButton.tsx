import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from '../../colors/themeStore';
import type { IconName } from '../../icons/icons';
import { radius } from '../../radius/radius';
import { layout, spacing } from '../../spacing/spacing';
import { usePressFeedback } from '../Pressable/usePressFeedback';
import { GlassSurface } from '../GlassSurface/GlassSurface';

export type IconButtonProps = {
  readonly icon: IconName;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly size?: number;
  readonly color?: string;
  readonly tinted?: boolean;
  readonly disabled?: boolean;
};

function IconButtonComponent({
  icon,
  onPress,
  accessibilityLabel,
  size = 22,
  color,
  tinted = false,
  disabled = false,
}: IconButtonProps): ReactElement {
  const feedback = usePressFeedback({ scaleTo: 0.9 });
  const theme = useThemeColors();

  return (
    <Animated.View style={feedback.animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={layout.hitSlop}
        onPress={onPress}
        onPressIn={feedback.onPressIn}
        onPressOut={feedback.onPressOut}
      >
        <GlassSurface
          cornerRadius={radius.pill}
          interactive
          {...(tinted ? { tintColor: theme.accentSoft } : {})}
          style={[styles.base, disabled && styles.disabled]}
        >
          <Ionicons name={icon} size={size} color={color ?? theme.textPrimary} />
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

export const IconButton = memo(IconButtonComponent);

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: layout.controlHeightCompact,
    minHeight: layout.controlHeightCompact,
    padding: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
