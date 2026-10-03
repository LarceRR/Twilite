import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { FieldDevCameraOverlay } from '../field/FieldDevCameraOverlay';
import { FieldSpaceCanvas } from '../field/FieldSpaceCanvas';

/** Field tab — 3D space with a numbered grid surface mesh. */
export function SpaceScreen(): ReactElement {
  const theme = useThemeColors();
  const developerCameraControlsEnabled = useSettingsStore(
    (s) => s.developerCameraControlsEnabled,
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      <FieldSpaceCanvas />
      {developerCameraControlsEnabled ? <FieldDevCameraOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
