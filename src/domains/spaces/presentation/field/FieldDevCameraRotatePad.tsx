import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';

import { useFieldCameraControlStore } from './fieldCameraControlStore';
import {
  CAMERA_ROTATE_STEP_DEG,
  type CameraRotateAxis,
  nextRotateAxis,
  rotateCameraEuler,
} from './fieldCameraMotion';
import { GlassIconButton } from './GlassIconButton';

export function FieldDevCameraRotatePad(): ReactElement {
  const [axis, setAxis] = useState<CameraRotateAxis>('y');
  const setRotationDeg = useFieldCameraControlStore((s) => s.setRotationDeg);
  const pulseActiveWorldAxis = useFieldCameraControlStore((s) => s.pulseActiveWorldAxis);

  const step = (sign: 1 | -1, deltaUnits: number): void => {
    const { rotationDeg } = useFieldCameraControlStore.getState();
    pulseActiveWorldAxis(axis);
    setRotationDeg(
      rotateCameraEuler(rotationDeg, axis, sign * deltaUnits * CAMERA_ROTATE_STEP_DEG),
    );
  };

  return (
    <View style={styles.row}>
      <GlassIconButton
        accessibilityLabel={`Ось ${axis.toUpperCase()}`}
        label={axis.toUpperCase()}
        onPress={() => {
          setAxis((current) => {
            const next = nextRotateAxis(current);
            pulseActiveWorldAxis(next);
            return next;
          });
        }}
      />
      <GlassIconButton
        accessibilityLabel="Вращать вверх"
        icon={icons.arrowUp}
        onStep={(delta) => step(1, delta)}
      />
      <GlassIconButton
        accessibilityLabel="Вращать вниз"
        icon={icons.arrowDown}
        onStep={(delta) => step(-1, delta)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.xs,
    alignItems: 'stretch',
  },
});
