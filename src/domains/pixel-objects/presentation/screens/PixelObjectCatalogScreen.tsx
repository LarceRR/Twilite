import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { type ReactElement, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { EmptyState } from '@/design-system/components/EmptyState/EmptyState';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';
import { useSurfaceObjectActions } from '@/domains/surface-objects/presentation/hooks/useSurfaceObjectActions';
import { knownKinds } from '@/domains/surface-objects/domain/value-objects/SurfaceObjectKind';
import { PIXEL_OBJECT_METADATA_KEY } from '@/shared/pixelObject/metadata';
import { radius } from '@/design-system/radius/radius';
import { spacing } from '@/design-system/spacing/spacing';
import type { PixelObjectDto } from '@/shared/contracts/pixelObjects';
import { toAppError } from '@/shared/errors';

import { catalogItemToMobileDto } from '../../application/catalogItemToMobileDto';
import { PixelSheetPreview } from '../components/PixelSheetPreview';

function resolveSurfaceKind(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === knownKinds.cloud) {
    return knownKinds.cloud;
  }
  return knownKinds.fire;
}

function ObjectCard({
  item,
  onSelect,
  busy,
}: {
  readonly item: PixelObjectDto;
  readonly onSelect: () => void;
  readonly busy: boolean;
}): ReactElement {
  const theme = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      disabled={busy}
      onPress={onSelect}
      style={[styles.card, { borderColor: theme.surfaceDivider, backgroundColor: theme.surfaceRaised }]}
    >
      <PixelSheetPreview item={item} />
      <Text variant="bodyStrong">{item.title}</Text>
      <Text variant="caption" color={theme.textSecondary} numberOfLines={2}>
        {item.authorDisplayName}
      </Text>
    </Pressable>
  );
}

export function PixelObjectCatalogScreen(): ReactElement {
  const theme = useThemeColors();
  const params = useLocalSearchParams<{ readonly surfaceKind?: string }>();
  const surfaceKind = resolveSurfaceKind(params.surfaceKind);
  const queryClient = useQueryClient();
  const { listPublishedPixelObjects } = useUseCases();
  const { activeSpace } = useSpaces();
  const { createAsync, isCreating } = useSurfaceObjectActions(activeSpace?.id ?? null);
  const [query, setQuery] = useState('');

  const catalog = useQuery({
    queryKey: ['pixel-objects', 'published'],
    queryFn: () => listPublishedPixelObjects(),
  });

  const items = useMemo(() => {
    const all = catalog.data ?? [];
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return all;
    }
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.authorDisplayName.toLowerCase().includes(needle),
    );
  }, [catalog.data, query]);

  const pick = (item: PixelObjectDto) => {
    if (isCreating) {
      return;
    }
    queryClient.setQueryData(
      ['pixel-objects', 'mobile', item.id],
      catalogItemToMobileDto(item),
    );
    void (async () => {
      await createAsync({
        kind: surfaceKind,
        metadata: { [PIXEL_OBJECT_METADATA_KEY]: item.id },
      });
      router.replace('/' as Href);
    })();
  };

  const title =
    surfaceKind === knownKinds.cloud ? 'Объект для плохого момента' : 'Объект для хорошего момента';

  return (
    <Screen title={title} reserveTabBar={false}>
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
          icon="cube-outline"
          title="Объектов пока нет"
          description="Опубликованные объекты появятся здесь после модерации"
        />
      ) : null}

      <View style={styles.list}>
        {items.map((item) => (
          <ObjectCard
            key={item.id}
            item={item}
            busy={isCreating}
            onSelect={() => pick(item)}
          />
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
    alignItems: 'center',
  },
});
