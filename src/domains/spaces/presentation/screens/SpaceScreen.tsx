import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSceneSkyColors, useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { FieldCameraControls } from '@/domains/spaces/presentation/field/FieldCameraControls';
import { FieldCanvas } from '@/domains/spaces/presentation/field/FieldCanvas';
import { FieldFpsOverlay } from '@/domains/spaces/presentation/field/FieldFpsOverlay';
import {
  useFieldMaxRow,
  useFieldSpritePlacements,
} from '@/domains/spaces/presentation/field/FieldObjectLayer';
import { FieldRefreshButton } from '@/domains/spaces/presentation/field/FieldRefreshButton';
import { useFieldMobileAssets } from '@/domains/spaces/presentation/field/useFieldMobileAssets';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';
import { useSurface } from '@/domains/surfaces/presentation/hooks/useSurface';
import { useRealtimeSync } from '@/infrastructure/realtime/useRealtimeSync';
import { toAppError } from '@/shared/errors';

type GradientColors = readonly [string, string, ...string[]];

/** Space tab: one R3F canvas — bridge + cell-bound sprite meshes. */
export function SpaceScreen(): ReactElement {
  const theme = useThemeColors();
  const skyStops = useSceneSkyColors();
  const colors = useMemo<GradientColors>(() => {
    const [first, second, ...rest] = skyStops;
    if (first !== undefined && second !== undefined) {
      return [first, second, ...rest];
    }
    return [first ?? '#87CEEB', first ?? '#E8F4FC'];
  }, [skyStops]);

  const { activeSpace, isLoading: spacesLoading } = useSpaces();
  const spaceId = activeSpace?.id ?? null;
  const { surface, isLoading: surfaceLoading, error } = useSurface(spaceId);

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

  // A failed background refetch keeps the last good snapshot on screen; only a
  // first load without data replaces the field with the error.
  if (error != null && surface === null) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.surface }]}>
        <Text variant="body">{toAppError(error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
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
