import { Button, Host, HStack, Menu, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize } from '@expo/ui/swift-ui/modifiers';
import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { floatingChromeBottomInset } from '@/app/navigation/tabBarLayout';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';
import { spacing } from '@/design-system/spacing/spacing';

import {
  CAMERA_AXES,
  CAMERA_AXIS_LABELS,
  CAMERA_CONTROL_MODE_LABELS,
  CAMERA_CONTROL_MODES,
} from './fieldCameraPose';
import {
  selectFieldCameraMode,
  selectFieldCameraPose,
  selectSurfaceBaseCompression,
  selectSurfaceEndCompression,
  useFieldCameraStore,
} from './fieldCameraStore';

const GLASS = [buttonStyle('glass'), controlSize('regular')] as const;
const GLASS_PAD = [buttonStyle('glass'), controlSize('large')] as const;

function formatCompression(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * iOS: glass Menu (move/rotate) + axis pad + dedicated −/+ steppers for optics/surface.
 */
function FieldCameraControlsComponent(): ReactElement | null {
  const enabled = useSettingsStore((state) => state.cameraControlEnabled);
  const mode = useFieldCameraStore(selectFieldCameraMode);
  const pose = useFieldCameraStore(selectFieldCameraPose);
  const baseCompression = useFieldCameraStore(selectSurfaceBaseCompression);
  const endCompression = useFieldCameraStore(selectSurfaceEndCompression);
  const setMode = useFieldCameraStore((state) => state.setMode);
  const nudgeAxis = useFieldCameraStore((state) => state.nudgeAxis);
  const nudgeFocal = useFieldCameraStore((state) => state.nudgeFocal);
  const nudgeBaseCompression = useFieldCameraStore((state) => state.nudgeBaseCompression);
  const nudgeEndCompression = useFieldCameraStore((state) => state.nudgeEndCompression);
  const insets = useSafeAreaInsets();

  if (!enabled) {
    return null;
  }

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.modeHost, { top: insets.top + spacing.sm, right: spacing.md }]}
      >
        <Host matchContents>
          <Menu
            label={CAMERA_CONTROL_MODE_LABELS[mode]}
            systemImage="camera.filters"
            modifiers={[buttonStyle('glass'), controlSize('regular')]}
          >
            {CAMERA_CONTROL_MODES.map((item) =>
              mode === item ? (
                <Button
                  key={item}
                  label={CAMERA_CONTROL_MODE_LABELS[item]}
                  systemImage="checkmark"
                  onPress={() => setMode(item)}
                />
              ) : (
                <Button
                  key={item}
                  label={CAMERA_CONTROL_MODE_LABELS[item]}
                  onPress={() => setMode(item)}
                />
              ),
            )}
          </Menu>
        </Host>
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.padHost,
          { bottom: floatingChromeBottomInset(insets.bottom) + spacing.sm },
        ]}
      >
        <Host matchContents>
          <VStack spacing={spacing.xs}>
            <HStack spacing={spacing.xs}>
              {CAMERA_AXES.slice(0, 3).map((axis) => (
                <Button
                  key={axis}
                  label={CAMERA_AXIS_LABELS[axis]}
                  modifiers={[...GLASS_PAD]}
                  onPress={() => nudgeAxis(axis)}
                />
              ))}
            </HStack>
            <HStack spacing={spacing.xs}>
              {CAMERA_AXES.slice(3).map((axis) => (
                <Button
                  key={axis}
                  label={CAMERA_AXIS_LABELS[axis]}
                  modifiers={[...GLASS_PAD]}
                  onPress={() => nudgeAxis(axis)}
                />
              ))}
            </HStack>

            <HStack spacing={spacing.xs}>
              <Button label="−" modifiers={[...GLASS]} onPress={() => nudgeFocal(-1)} />
              <Text>{`Фокус ${pose.focalLengthMm.toFixed(1)} мм`}</Text>
              <Button label="+" modifiers={[...GLASS]} onPress={() => nudgeFocal(1)} />
            </HStack>
            <HStack spacing={spacing.xs}>
              <Button label="−" modifiers={[...GLASS]} onPress={() => nudgeBaseCompression(-1)} />
              <Text>{`Основание ${formatCompression(baseCompression)}`}</Text>
              <Button label="+" modifiers={[...GLASS]} onPress={() => nudgeBaseCompression(1)} />
            </HStack>
            <HStack spacing={spacing.xs}>
              <Button label="−" modifiers={[...GLASS]} onPress={() => nudgeEndCompression(-1)} />
              <Text>{`Конец ${formatCompression(endCompression)}`}</Text>
              <Button label="+" modifiers={[...GLASS]} onPress={() => nudgeEndCompression(1)} />
            </HStack>
          </VStack>
        </Host>
      </View>
    </>
  );
}

export const FieldCameraControls = memo(FieldCameraControlsComponent);

const styles = StyleSheet.create({
  modeHost: {
    position: 'absolute',
    zIndex: 30,
  },
  padHost: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 30,
    alignItems: 'center',
  },
});
