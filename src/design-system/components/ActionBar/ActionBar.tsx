import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from '../../colors/colors';
import type { IconName } from '../../icons/icons';
import { radius } from '../../radius/radius';
import { layout, spacing } from '../../spacing/spacing';
import { GlassSurface } from '../GlassSurface/GlassSurface';
import { usePressFeedback } from '../Pressable/usePressFeedback';
import { Text } from '../Text/Text';

export type ActionBarAction = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly tint: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
};

export type ActionBarProps = {
  readonly actions: readonly ActionBarAction[];
};

function Action({ action }: { readonly action: ActionBarAction }): ReactElement {
  const theme = useThemeColors();
  const feedback = usePressFeedback({ scaleTo: 0.94 });
  const disabled = action.disabled ?? false;

  return (
    <Animated.View style={[styles.actionWrap, feedback.animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={layout.hitSlop}
        onPress={action.onPress}
        onPressIn={feedback.onPressIn}
        onPressOut={feedback.onPressOut}
        style={[styles.action, disabled && styles.disabled]}
      >
        <View style={[styles.iconBadge, { backgroundColor: action.tint }]}>
          <Ionicons name={action.icon} size={18} color={theme.textInverted} />
        </View>
        <Text variant="captionStrong" numberOfLines={1}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function ActionBarComponent({ actions }: ActionBarProps): ReactElement {
  return (
    <GlassSurface cornerRadius={radius.xl}>
      <View style={styles.row}>
        {actions.map((action) => (
          <Action key={action.id} action={action} />
        ))}
      </View>
    </GlassSurface>
  );
}

export const ActionBar = memo(ActionBarComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: layout.actionBarHeight,
    paddingHorizontal: spacing.sm,
  },
  actionWrap: {
    flex: 1,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
