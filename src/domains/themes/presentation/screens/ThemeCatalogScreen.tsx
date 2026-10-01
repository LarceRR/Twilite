import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useThemeColors, useThemePack } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import type { AppThemePack } from '@/design-system/themes';
import { radius } from '@/design-system/radius/radius';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

function SkyStrip({ stops }: { readonly stops: readonly string[] }): ReactElement {
  return (
    <View style={styles.skyStrip}>
      {stops.map((color, index) => (
        <View key={`${color}-${index}`} style={[styles.skyStop, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function ThemeCard({
  pack,
  active,
}: {
  readonly pack: AppThemePack;
  readonly active: boolean;
}): ReactElement {
  const theme = useThemeColors();
  const swatches = [pack.colors.surface, pack.colors.accent, pack.colors.textPrimary, pack.colors.secondary];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pack.name}
      onPress={() =>
        router.push({ pathname: '/theme-catalog/[id]', params: { id: pack.id } })
      }
      style={[styles.card, { borderColor: theme.surfaceDivider, backgroundColor: theme.surfaceRaised }]}
    >
      <SkyStrip stops={pack.sceneBackgroundColors} />
      <View style={styles.swatchRow}>
        {swatches.map((color) => (
          <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>
      <Text variant="bodyStrong">{pack.name}</Text>
      <Text variant="caption" color={theme.textSecondary} numberOfLines={2}>
        {pack.description || 'Без описания'}
      </Text>
      <Text variant="caption" color={theme.textTertiary}>
        {pack.authorDisplayName} · {new Date(pack.createdAt).toLocaleDateString('ru-RU')}
        {active ? ' · Активна' : ''}
      </Text>
    </Pressable>
  );
}

export function ThemeCatalogScreen(): ReactElement {
  const theme = useThemeColors();
  const active = useThemePack();
  const { listPublishedThemes } = useUseCases();
  const [query, setQuery] = useState('');
  const catalog = useQuery({
    queryKey: ['app-themes', 'published'],
    queryFn: () => listPublishedThemes(),
  });

  const items = useMemo(() => {
    const all = catalog.data ?? [];
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return all;
    }
    return all.filter(
      (pack) =>
        pack.name.toLowerCase().includes(needle) ||
        pack.description.toLowerCase().includes(needle) ||
        pack.authorDisplayName.toLowerCase().includes(needle),
    );
  }, [catalog.data, query]);

  return (
    <Screen title="Каталог тем" reserveTabBar={false}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Поиск"
        placeholderTextColor={theme.textTertiary}
        style={[
          styles.search,
          {
            backgroundColor: theme.surfaceSunken,
            color: theme.textPrimary,
          },
        ]}
      />

      {catalog.isLoading ? (
        <ActivityIndicator color={theme.textSecondary} style={{ marginTop: spacing.xl }} />
      ) : null}

      {catalog.isError ? (
        <BlurCard title="Не удалось загрузить каталог">
          <Text variant="caption">{toAppError(catalog.error).message}</Text>
          <Button label="Повторить" onPress={() => void catalog.refetch()} />
        </BlurCard>
      ) : null}

      {!catalog.isLoading && !catalog.isError && items.length === 0 ? (
        <EmptyState
          icon="color-palette-outline"
          title="Тем не найдено"
          description="Попробуйте другой запрос или загляните позже"
        />
      ) : null}

      <View style={styles.list}>
        {items.map((pack) => (
          <ThemeCard key={pack.id} pack={pack} active={pack.id === active.id} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  skyStrip: {
    flexDirection: 'row',
    height: 28,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  skyStop: {
    flex: 1,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
  },
});
