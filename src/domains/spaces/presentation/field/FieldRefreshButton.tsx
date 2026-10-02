import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { radius } from '@/design-system/radius/radius';
import { spacing } from '@/design-system/spacing/spacing';
import type { SpaceId } from '@/domains/spaces/domain/value-objects/SpaceId';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { fieldRefreshButtonTop } from './fieldRefresh';
import { useRefreshFieldAndSpace } from './useRefreshFieldAndSpace';

type FieldRefreshButtonProps = {
  readonly spaceId: SpaceId | null;
};

function FieldRefreshButtonComponent({ spaceId }: FieldRefreshButtonProps): ReactElement {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const cameraControlsVisible = useSettingsStore((state) => state.cameraControlEnabled);
  const { refresh, refreshing } = useRefreshFieldAndSpace(spaceId);
  const top = fieldRefreshButtonTop(insets.top, cameraControlsVisible);

  return (
    <View pointerEvents="box-none" style={[styles.host, { top, right: spacing.md }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Обновить поле и пространство"
        accessibilityState={{ disabled: refreshing, busy: refreshing }}
        disabled={refreshing}
        onPress={refresh}
      >
        <GlassSurface cornerRadius={radius.lg} interactive>
          <View style={styles.chip}>
            {refreshing ? (
              <ActivityIndicator color={theme.textPrimary} size="small" />
            ) : (
              <Ionicons name={icons.refresh} size={16} color={theme.textPrimary} />
            )}
            <Text variant="captionStrong" color={theme.textPrimary}>
              Обновить
            </Text>
          </View>
        </GlassSurface>
      </Pressable>
    </View>
  );
}

export const FieldRefreshButton = memo(FieldRefreshButtonComponent);

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 30,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
