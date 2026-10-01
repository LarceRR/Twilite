import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactElement, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { useThemeColors, useThemePack } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { TOKEN_META } from '@/design-system/themes';
import { radius } from '@/design-system/radius/radius';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

export function ThemeDetailScreen(): ReactElement {
  const theme = useThemeColors();
  const active = useThemePack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeId = typeof id === 'string' ? id : '';
  const { getThemeDetail, applyTheme } = useUseCases();
  const showToast = useUiStore((state) => state.showToast);

  const detail = useQuery({
    queryKey: ['app-themes', themeId],
    queryFn: () => getThemeDetail(themeId),
    enabled: themeId.length > 0,
  });

  const apply = useMutation({
    mutationFn: applyTheme,
    onSuccess: () => {
      showToast('Тема применена', 'positive');
      router.back();
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  const colorEntries = useMemo(() => {
    if (detail.data === undefined) {
      return [];
    }
    return TOKEN_META.filter((entry) => entry.key !== 'sceneBackgroundColors').map((entry) => ({
      ...entry,
      value: detail.data.colors[entry.key as keyof typeof detail.data.colors],
    }));
  }, [detail.data]);

  const isActive = detail.data !== undefined && detail.data.id === active.id;

  return (
    <Screen title={detail.data?.name ?? 'Тема'} reserveTabBar={false}>
      {detail.isLoading ? (
        <ActivityIndicator color={theme.textSecondary} style={{ marginTop: spacing.xl }} />
      ) : null}

      {detail.isError ? (
        <BlurCard title="Не удалось открыть тему">
          <Text variant="caption">{toAppError(detail.error).message}</Text>
          <Button label="Назад" onPress={() => router.back()} />
        </BlurCard>
      ) : null}

      {detail.data !== undefined ? (
        <>
          <View style={styles.sky}>
            {detail.data.sceneBackgroundColors.map((color, index) => (
              <View key={`${color}-${index}`} style={[styles.skyStop, { backgroundColor: color }]} />
            ))}
          </View>
          <Text variant="caption" color={theme.textSecondary}>
            {detail.data.authorDisplayName} ·{' '}
            {new Date(detail.data.createdAt).toLocaleDateString('ru-RU')}
          </Text>
          <Text variant="body">{detail.data.description || 'Без описания'}</Text>

          <BlurCard title="Небо сцены">
            <Text variant="caption" color={theme.textSecondary}>
              Градиент сверху вниз · {detail.data.sceneBackgroundColors.length} цвета
            </Text>
            <View style={styles.tokenRow}>
              {detail.data.sceneBackgroundColors.map((color) => (
                <View key={color} style={styles.token}>
                  <View style={[styles.swatch, { backgroundColor: color }]} />
                  <Text variant="caption">{color}</Text>
                </View>
              ))}
            </View>
          </BlurCard>

          <BlurCard title="Цвета интерфейса">
            <View style={styles.tokenList}>
              {colorEntries.map((entry) => (
                <View key={entry.key} style={styles.token}>
                  <View style={[styles.swatch, { backgroundColor: entry.value }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="captionStrong">{entry.key}</Text>
                    <Text variant="caption" color={theme.textSecondary}>
                      {entry.descriptionRu}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </BlurCard>

          <Button
            label={isActive ? 'Уже используется' : 'Использовать'}
            onPress={() => apply.mutate(detail.data)}
            disabled={isActive || apply.isPending}
            loading={apply.isPending}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sky: {
    flexDirection: 'row',
    height: 72,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  skyStop: {
    flex: 1,
  },
  tokenList: {
    gap: spacing.sm,
  },
  tokenRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
});
