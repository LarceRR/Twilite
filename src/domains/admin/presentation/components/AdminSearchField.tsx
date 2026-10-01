import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { icons } from '@/design-system/icons/icons';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { typography } from '@/design-system/typography/typography';

export type AdminSearchFieldProps = {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder?: string;
  readonly accessibilityLabel?: string;
};

function AdminSearchFieldComponent({
  value,
  onChangeText,
  placeholder = 'Поиск',
  accessibilityLabel = 'Поиск',
}: AdminSearchFieldProps): ReactElement {
  const theme = useThemeColors();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.surfaceSunken, borderColor: theme.surfaceDivider },
      ]}
    >
      <Ionicons name={icons.search} size={18} color={theme.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        style={[styles.input, { color: theme.textPrimary }]}
      />
      {value.length === 0 ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Очистить поиск"
          hitSlop={layout.hitSlop}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <Ionicons name={icons.close} size={18} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

export const AdminSearchField = memo(AdminSearchFieldComponent);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.controlHeightCompact,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  clear: {
    padding: spacing.xs,
  },
});
