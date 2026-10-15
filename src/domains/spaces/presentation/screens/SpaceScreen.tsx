import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useThemeColors } from '@/design-system/colors/colors';
import { useSettingsStore } from '@/domains/settings/presentation/stores/settingsStore';

import { FieldDevCameraOverlay } from '../field/FieldDevCameraOverlay';
import { FieldDevMaterialOverlay } from '../field/FieldDevMaterialOverlay';
import { FieldSpaceCanvas } from '../field/FieldSpaceCanvas';
import { useSpaces } from '../hooks/useSpaces';
import { useSurfaceSnapshot } from '../hooks/useSurfaceSnapshot';

const EMPTY_OBJECTS: readonly import('../../domain/entities/SurfaceObject').SurfaceObject[] = [];

/** Field tab — 3D space with a numbered grid surface mesh. */
export function SpaceScreen(): ReactElement {
  const theme = useThemeColors();
  const developerCameraControlsEnabled = useSettingsStore((s) => s.developerCameraControlsEnabled);
  const developerMaterialControlsEnabled = useSettingsStore((s) => s.developerMaterialControlsEnabled);
  const { activeSpace } = useSpaces();
  const snapshot = useSurfaceSnapshot(activeSpace?.id ?? null);
  const headers = useAuthenticatedAssetHeaders();

  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      <FieldSpaceCanvas headers={headers} objects={snapshot.data?.objects ?? EMPTY_OBJECTS} />
      {developerCameraControlsEnabled ? <FieldDevCameraOverlay /> : null}
      {developerMaterialControlsEnabled ? <FieldDevMaterialOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
