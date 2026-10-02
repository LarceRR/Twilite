import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { useSceneSkyColors, useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { FieldCanvas } from '@/domains/spaces/presentation/field/FieldCanvas';
import { FieldFpsOverlay } from '@/domains/spaces/presentation/field/FieldFpsOverlay';
import {
  useFieldMaxRow,
  useFieldSpritePlacements,
} from '@/domains/spaces/presentation/field/FieldObjectLayer';
import { FieldSpriteGlLayer } from '@/domains/spaces/presentation/field/FieldSpriteGlLayer';
import { useFieldMobileAssets } from '@/domains/spaces/presentation/field/useFieldMobileAssets';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';
import { useSurface } from '@/domains/surfaces/presentation/hooks/useSurface';
import { useRealtimeSync } from '@/infrastructure/realtime/useRealtimeSync';
import { toAppError } from '@/shared/errors';

type GradientColors = readonly [string, string, ...string[]];

/** Space tab: 3D bridge + one GL overlay for all crisp pixel sprites. */
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
  const [fieldViewport, setFieldViewport] = useState({ width: 0, height: 0 });
  const onFieldLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFieldViewport((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

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
    <View style={styles.root} onLayout={onFieldLayout}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <FieldCanvas maxRow={maxRow} />
      <FieldSpriteGlLayer viewport={fieldViewport} sprites={sprites} />
      <FieldFpsOverlay />
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
