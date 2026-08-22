import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { cameraMotion } from '@/design-system/motion/camera';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import { useSurfaceObjectsStore } from '@/domains/surface-objects/presentation/stores/surfaceObjectsStore';
import { useCameraStore } from '@/scene/stores/cameraStore';
import { selectFreeZone, selectHitbox, useInspectStore } from '@/scene/stores/inspectStore';
import { selectFps, useSceneStore } from '@/scene/stores/sceneStore';

function DebugInfoComponent(): ReactElement | null {
  const enabled = useSettingsStore((state) => state.showPerformanceOverlay);
  const theme = useThemeColors();
  const fps = useSceneStore(selectFps);
  const orbit = useCameraStore((state) => state.orbit);
  const defaultDistance = useCameraStore((state) => state.defaultDistance);
  const objectCount = useSurfaceObjectsStore((state) => state.order.length);
  const hitbox = useInspectStore(selectHitbox);
  const freeZone = useInspectStore(selectFreeZone);

  if (!enabled) return null;

  const zoom = orbit.distance / Math.max(defaultDistance, 0.001);
  const angle = Math.round((orbit.elevation * 180) / Math.PI);
  const fill =
    hitbox === null || freeZone === null || freeZone.height <= 0
      ? null
      : Math.round((hitbox.screen.height / freeZone.height) * 100);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          backgroundColor: theme.surfaceRaised,
          borderColor: theme.surfaceDivider,
        },
      ]}
    >
      <Text
        variant="caption"
        color={theme.textPrimary}
      >{`FPS ${fps} · объектов ${objectCount}`}</Text>
      <Text
        variant="caption"
        color={theme.textSecondary}
      >{`zoom ${zoom.toFixed(2)}x · угол ${angle}°`}</Text>
      <Text
        variant="caption"
        color={theme.textTertiary}
      >{`zoom ${cameraMotion.minDistanceFactor}…${cameraMotion.maxDistanceFactor}x · угол ${cameraMotion.minElevationDeg}…${cameraMotion.maxElevationDeg}°`}</Text>
      <Text
        variant="caption"
        color={theme.textTertiary}
      >{`distance ${orbit.distance.toFixed(2)} · azimuth ${Math.round((orbit.azimuth * 180) / Math.PI)}°`}</Text>
      {hitbox === null ? null : (
        <Text variant="caption" color={theme.textTertiary}>
          {`хитбокс ${Math.round(hitbox.screen.width)}×${Math.round(hitbox.screen.height)} px${hitbox.manual ? ' (вручную)' : ''}`}
        </Text>
      )}
      {fill === null || freeZone === null || hitbox === null ? null : (
        <Text variant="caption" color={theme.textTertiary}>
          {`своб. зона ${Math.round(freeZone.height)} px · заполнение ${fill}% · сдвиг ${Math.round(hitbox.center.y - freeZone.centerY)} px`}
        </Text>
      )}
    </View>
  );
}

export const DebugInfo = memo(DebugInfoComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 88,
    left: 16,
    gap: 2,
    padding: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
