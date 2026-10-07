import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';

import { useFieldCameraControlStore } from './fieldCameraControlStore';
import {
  type CameraMoveAxis,
  moveCameraPosition,
  worldAxisFromMove,
} from './fieldCameraMotion';
import { getFieldConfig } from './fieldConfigStore';
import { GlassIconButton } from './GlassIconButton';

const MOVE_BUTTONS: readonly {
  readonly axis: CameraMoveAxis;
  readonly icon: (typeof icons)[keyof typeof icons];
  readonly label: string;
}[] = [
  { axis: 'left', icon: icons.arrowLeft, label: 'Влево' },
  { axis: 'right', icon: icons.arrowRight, label: 'Вправо' },
  { axis: 'up', icon: icons.arrowUp, label: 'Вверх' },
  { axis: 'down', icon: icons.arrowDown, label: 'Вниз' },
  { axis: 'forward', icon: icons.moveForward, label: 'Вперёд' },
  { axis: 'back', icon: icons.moveBack, label: 'Назад' },
];

export function FieldDevCameraMovePad(): ReactElement {
  const setPosition = useFieldCameraControlStore((s) => s.setPosition);
  const pulseActiveWorldAxis = useFieldCameraControlStore((s) => s.pulseActiveWorldAxis);

  const step = (axis: CameraMoveAxis, deltaUnits: number): void => {
    const { position } = useFieldCameraControlStore.getState();
    pulseActiveWorldAxis(worldAxisFromMove(axis));
    setPosition(
      moveCameraPosition(
        position,
        axis,
        deltaUnits * getFieldConfig().camera.moveStepPx,
      ),
    );
  };

  return (
    <View style={styles.row}>
      {MOVE_BUTTONS.map((btn) => (
        <GlassIconButton
          key={btn.axis}
          accessibilityLabel={btn.label}
          icon={btn.icon}
          onStep={(delta) => step(btn.axis, delta)}
        />
      ))}
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
