import type { ReactElement } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/themeStore';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

import type { Space } from '../../domain/entities/Space';
import { useSpaces } from '../hooks/useSpaces';
import { useClearSurfaceMoments, useSurfaceMomentStats } from '../hooks/useSurfaceMomentManagement';

export function MySpacesScreen(): ReactElement {
  const { spaces, isLoading, error } = useSpaces();
  const theme = useThemeColors();
  const personalSpace = spaces.find((space) => space.type === 'Personal');

  return (
    <Screen title="Мои пространства" reserveTabBar={false}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : error !== null && error !== undefined ? (
        <Text variant="body">{toAppError(error).message}</Text>
      ) : spaces.length === 0 ? (
        <Text variant="body">Пространств пока нет</Text>
      ) : (
        <>
          {spaces.map((space) => (
            <SpaceSummary key={space.id} space={space} />
          ))}
          {personalSpace === undefined ? null : <ClearPersonalSpaceButton space={personalSpace} />}
        </>
      )}
    </Screen>
  );
}

function SpaceSummary({ space }: { readonly space: Space }): ReactElement {
  const theme = useThemeColors();
  const stats = useSurfaceMomentStats(space.id);

  return (
    <BlurCard title={space.title}>
      <View style={styles.stats}>
        <MomentCount label="Всего" value={stats.data?.total} />
        <MomentCount label="Хороших" value={stats.data?.good} color={theme.positive} />
        <MomentCount label="Плохих" value={stats.data?.bad} color={theme.negative} />
      </View>
      {stats.isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : stats.error !== null ? (
        <Text variant="caption">{toAppError(stats.error).message}</Text>
      ) : null}
    </BlurCard>
  );
}

function ClearPersonalSpaceButton({ space }: { readonly space: Space }): ReactElement {
  const clear = useClearSurfaceMoments(space.id);

  const confirmClear = (): void => {
    Alert.alert(
      'Удалить моменты?',
      `Все моменты и история пространства «${space.title}» будут удалены без возможности восстановления.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить моменты',
          style: 'destructive',
          onPress: () => clear.mutate(),
        },
      ],
    );
  };

  return (
    <View>
      <Button
        label="Удалить моменты"
        variant="danger"
        loading={clear.isPending}
        accessibilityHint="Удаляет моменты и историю личного пространства"
        onPress={confirmClear}
      />
      {clear.error === null ? null : (
        <Text variant="caption">{toAppError(clear.error).message}</Text>
      )}
    </View>
  );
}

function MomentCount({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: number | undefined;
  readonly color?: string;
}): ReactElement {
  return (
    <View style={styles.stat}>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="bodyStrong" {...(color === undefined ? {} : { color })}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
});
