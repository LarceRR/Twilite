import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { selectFps, useSceneStore } from '@/scene/stores/sceneStore';

import {
  selectFieldCameraPose,
  selectSurfaceBaseCompression,
  selectSurfaceEndCompression,
  useFieldCameraStore,
} from './fieldCameraStore';

function formatCoord(value: number): string {
  return value.toFixed(2);
}

function formatDeg(rad: number): string {
  return ((rad * 180) / Math.PI).toFixed(1);
}

function formatCompression(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Shows R3F canvas FPS (from `FpsMeter` inside the field scene) and optional camera pose. */
function FieldFpsOverlayComponent(): ReactElement | null {
  const showFps = useSettingsStore((state) => state.showPerformanceOverlay);
  const showCamera = useSettingsStore((state) => state.cameraControlEnabled);
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const objectCount = useSurfaceObjectsStore((state) => state.order.length);
  const fps = useSceneStore(selectFps);
  const pose = useFieldCameraStore(selectFieldCameraPose);
  const baseCompression = useFieldCameraStore(selectSurfaceBaseCompression);
  const endCompression = useFieldCameraStore(selectSurfaceEndCompression);

  if (!showFps && !showCamera) {
    return null;
  }

  const chipStyle = [
    styles.chip,
    {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.surfaceDivider,
    },
  ];

  return (
    <View pointerEvents="none" style={[styles.root, { top: insets.top + 8 }]}>
      {showFps ? (
        <View style={chipStyle}>
          <Text variant="caption" color={theme.textPrimary}>
            {`FPS ${fps} · объектов ${objectCount}`}
          </Text>
        </View>
      ) : null}
      {showCamera ? (
        <View style={chipStyle}>
          <Text variant="caption" color={theme.textPrimary}>
            {`X ${formatCoord(pose.position.x)}  Y ${formatCoord(pose.position.y)}  Z ${formatCoord(pose.position.z)}`}
          </Text>
          <Text variant="caption" color={theme.textSecondary}>
            {`yaw ${formatDeg(pose.yaw)}°  pitch ${formatDeg(pose.pitch)}°  roll ${formatDeg(pose.roll)}°`}
          </Text>
          <Text variant="caption" color={theme.textSecondary}>
            {`фокус ${pose.focalLengthMm.toFixed(1)} мм`}
          </Text>
          <Text variant="caption" color={theme.textSecondary}>
            {`основание ${formatCompression(baseCompression)} · конец ${formatCompression(endCompression)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const FieldFpsOverlay = memo(FieldFpsOverlayComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    gap: 6,
    maxWidth: '72%',
  },
  chip: {
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
