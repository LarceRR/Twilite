import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useThemeColors, useSceneSkyColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { FieldCanvas } from '@/domains/spaces/presentation/field/FieldCanvas';
import { FieldRefreshButton } from '@/domains/spaces/presentation/field/FieldRefreshButton';
import { FieldCameraControls } from '@/domains/spaces/presentation/field/FieldCameraControls';
import { FieldFpsOverlay } from '@/domains/spaces/presentation/field/FieldFpsOverlay';
import {
  useFieldMaxRow,
  useFieldSpritePlacements,
} from '@/domains/spaces/presentation/field/FieldObjectLayer';
import { useFieldMobileAssets } from '@/domains/spaces/presentation/field/useFieldMobileAssets';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';
import { useSurface } from '@/domains/surfaces/presentation/hooks/useSurface';
import { useRealtimeSync } from '@/infrastructure/realtime/useRealtimeSync';
import { toAppError } from '@/shared/errors';

/** Space tab: one R3F canvas — bridge + cell-bound sprite meshes. */
export function SpaceScreen(): ReactElement {
  const theme = useThemeColors();
  const skyStops = useSceneSkyColors();
  const colors =
    skyStops.length >= 2 ? [...skyStops] : [skyStops[0] ?? '#87CEEB', skyStops[0] ?? '#E8F4FC'];

  const { activeSpace, isLoading: spacesLoading } = useSpaces();
  const spaceId = activeSpace?.id ?? null;
  const { isLoading: surfaceLoading, error } = useSurface(spaceId);

  useRealtimeSync(spaceId);

  const mobileById = useFieldMobileAssets();
  const sprites = useFieldSpritePlacements(mobileById);
  const maxRow = useFieldMaxRow();

  if (spacesLoading || (spaceId !== null && surfaceLoading)) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  if (spaceId === null) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surface }]}>
        <Text variant="body">Выберите или создайте пространство</Text>
      </View>
    );
  }

  if (error != null) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surface }]}>
        <Text variant="body">{toAppError(error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      <FieldCanvas maxRow={maxRow} sprites={sprites} />
      <FieldFpsOverlay />
      <FieldRefreshButton spaceId={spaceId} />
      <FieldCameraControls />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
