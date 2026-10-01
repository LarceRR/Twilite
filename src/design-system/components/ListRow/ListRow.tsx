import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors } from '../../colors/themeStore';
import { type IconName, icons } from '../../icons/icons';
import { layout, spacing } from '../../spacing/spacing';
import { Text } from '../Text/Text';

export type ListRowProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: IconName;
  readonly leading?: ReactNode;
  readonly iconTint?: string;
  readonly titleNumberOfLines?: number;
  readonly onPress?: () => void;
  readonly trailing?: ReactNode;
};

function ListRowComponent({
  title,
  subtitle,
  icon,
  leading,
  iconTint,
  titleNumberOfLines = 1,
  onPress,
  trailing,
}: ListRowProps): ReactElement {
  const theme = useThemeColors();
  const media =
    leading ??
    (icon === undefined ? null : (
      <Ionicons name={icon} size={20} color={iconTint ?? theme.textSecondary} />
    ));

  const body = (
    <View style={styles.row}>
      {media === null ? null : <View style={styles.iconWrap}>{media}</View>}
      <View style={styles.textWrap}>
        <Text variant="bodyStrong" numberOfLines={titleNumberOfLines}>
          {title}
        </Text>
        {subtitle === undefined ? null : (
          <Text variant="caption" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ??
        (onPress === undefined ? null : (
          <Ionicons name={icons.chevronRight} size={18} color={theme.textTertiary} />
        ))}
    </View>
  );

  if (onPress === undefined) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  );
}

export const ListRow = memo(ListRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: 0.6,
  },
});
