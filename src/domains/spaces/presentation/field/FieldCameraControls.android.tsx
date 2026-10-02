import { memo, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { floatingChromeBottomInset } from '@/app/navigation/tabBarLayout';
import { useThemeColors } from '@/design-system/colors/colors';
import { GlassSurface } from '@/design-system/components/GlassSurface/GlassSurface';
import { Text } from '@/design-system/components/Text/Text';
import { radius } from '@/design-system/radius/radius';
import { spacing } from '@/design-system/spacing/spacing';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

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

function formatCompression(value: number): string {
  return `${Math.round(value * 100)}%`;
}

type StepperProps = {
  readonly label: string;
  readonly onMinus: () => void;
  readonly onPlus: () => void;
};

function Stepper({ label, onMinus, onPlus }: StepperProps): ReactElement {
  const theme = useThemeColors();
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} style={styles.stepBtn} accessibilityRole="button">
        <Text variant="captionStrong" color={theme.textPrimary}>
          −
        </Text>
      </Pressable>
      <Text variant="caption" color={theme.textPrimary} style={styles.stepLabel}>
        {label}
      </Text>
      <Pressable onPress={onPlus} style={styles.stepBtn} accessibilityRole="button">
        <Text variant="captionStrong" color={theme.textPrimary}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

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
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  if (!enabled) {
    return null;
  }

  const cycleMode = (): void => {
    const index = CAMERA_CONTROL_MODES.indexOf(mode);
    const next = CAMERA_CONTROL_MODES[(index + 1) % CAMERA_CONTROL_MODES.length];
    if (next !== undefined) {
      setMode(next);
    }
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.modeHost, { top: insets.top + spacing.sm, right: spacing.md }]}
      >
        <Pressable onPress={cycleMode} accessibilityRole="button" accessibilityLabel="Режим камеры">
          <GlassSurface cornerRadius={radius.lg} interactive style={styles.modeChip}>
            <Text variant="captionStrong" color={theme.textPrimary}>
              {CAMERA_CONTROL_MODE_LABELS[mode]}
            </Text>
          </GlassSurface>
        </Pressable>
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.padHost,
          { bottom: floatingChromeBottomInset(insets.bottom) + spacing.sm },
        ]}
      >
        <GlassSurface cornerRadius={radius.xl} interactive style={styles.pad}>
          <View style={styles.row}>
            {CAMERA_AXES.slice(0, 3).map((axis) => (
              <Pressable
                key={axis}
                onPress={() => nudgeAxis(axis)}
                style={styles.axisBtn}
                accessibilityRole="button"
                accessibilityLabel={CAMERA_AXIS_LABELS[axis]}
              >
                <Text variant="captionStrong" color={theme.textPrimary}>
                  {CAMERA_AXIS_LABELS[axis]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            {CAMERA_AXES.slice(3).map((axis) => (
              <Pressable
                key={axis}
                onPress={() => nudgeAxis(axis)}
                style={styles.axisBtn}
                accessibilityRole="button"
                accessibilityLabel={CAMERA_AXIS_LABELS[axis]}
              >
                <Text variant="captionStrong" color={theme.textPrimary}>
                  {CAMERA_AXIS_LABELS[axis]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Stepper
            label={`Фокус ${pose.focalLengthMm.toFixed(1)} мм`}
            onMinus={() => nudgeFocal(-1)}
            onPlus={() => nudgeFocal(1)}
          />
          <Stepper
            label={`Основание ${formatCompression(baseCompression)}`}
            onMinus={() => nudgeBaseCompression(-1)}
            onPlus={() => nudgeBaseCompression(1)}
          />
          <Stepper
            label={`Конец ${formatCompression(endCompression)}`}
            onMinus={() => nudgeEndCompression(-1)}
            onPlus={() => nudgeEndCompression(1)}
          />
        </GlassSurface>
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
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  padHost: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 30,
    alignItems: 'center',
  },
  pad: {
    width: '100%',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  axisBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepBtn: {
    minWidth: 40,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  stepLabel: {
    flex: 1,
    textAlign: 'center',
  },
});
