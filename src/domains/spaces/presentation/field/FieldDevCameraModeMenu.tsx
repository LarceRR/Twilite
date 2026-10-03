import { useActionSheet } from '@expo/react-native-action-sheet';
import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import { icons } from '@/design-system/icons/icons';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';

export type FieldDevCameraMode = 'move' | 'rotate';

type FieldDevCameraModeMenuProps = {
  readonly mode: FieldDevCameraMode;
  readonly onModeChange: (mode: FieldDevCameraMode) => void;
};

const MODE_LABEL: Record<FieldDevCameraMode, string> = {
  move: 'Перемещение',
  rotate: 'Вращение',
};

export function FieldDevCameraModeMenu({
  mode,
  onModeChange,
}: FieldDevCameraModeMenuProps): ReactElement {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const { showActionSheetWithOptions } = useActionSheet();

  const openMenu = (): void => {
    const options = ['Перемещение', 'Вращение', 'Отмена'];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 2,
        title: 'Режим камеры',
      },
      (index) => {
        if (index === 0) onModeChange('move');
        if (index === 1) onModeChange('rotate');
      },
    );
  };

  return (
    <View style={[styles.wrap, { top: insets.top + spacing.sm, right: spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Режим камеры"
        hitSlop={layout.hitSlop}
        onPress={openMenu}
      >
        <GlassSurface cornerRadius={radius.md} interactive style={styles.surface}>
          <View style={styles.row}>
            <Text style={[styles.text, { color: theme.textPrimary }]}>{MODE_LABEL[mode]}</Text>
            <Ionicons name={icons.chevronDown} size={16} color={theme.textPrimary} />
          </View>
        </GlassSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 20,
  },
  surface: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
