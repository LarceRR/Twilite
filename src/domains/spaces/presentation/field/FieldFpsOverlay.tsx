import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { selectFps, useSceneStore } from '@/scene/stores/sceneStore';

/** Shows R3F canvas FPS (from `FpsMeter` inside the field scene). */
function FieldFpsOverlayComponent(): ReactElement | null {
  const enabled = useSettingsStore((state) => state.showPerformanceOverlay);
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const objectCount = useSurfaceObjectsStore((state) => state.order.length);
  const fps = useSceneStore(selectFps);

  if (!enabled) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          top: insets.top + 8,
          backgroundColor: theme.surfaceRaised,
          borderColor: theme.surfaceDivider,
        },
      ]}
    >
      <Text variant="caption" color={theme.textPrimary}>
        {`FPS ${fps} · объектов ${objectCount}`}
      </Text>
    </View>
  );
}

export const FieldFpsOverlay = memo(FieldFpsOverlayComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
