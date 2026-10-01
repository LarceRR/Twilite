import { type Href, useRouter } from 'expo-router';
import { type ReactElement, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useServices } from '@/app/providers/ContainerProvider';
import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

import { AdminSearchField } from '../components/AdminSearchField';
import { useAdminGroups } from '../hooks/useAdminQueries';

export function AdminGroupsScreen(): ReactElement {
  const router = useRouter();
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const { data, isLoading, error } = useAdminGroups();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const groups = data ?? [];
    if (needle.length === 0) {
      return groups;
    }
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(needle) ||
        group.descriptionRu.toLowerCase().includes(needle) ||
        group.descriptionEn.toLowerCase().includes(needle),
    );
  }, [data, query]);

  const parentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of data ?? []) {
      map.set(group.id, group.name);
    }
    return map;
  }, [data]);

  if (isSandbox) {
    return (
      <Screen title="Группы" reserveTabBar={false}>
        <Text variant="body">Админ-панель недоступна в офлайн-режиме.</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Группы" subtitle="Наследование и набор прав" reserveTabBar={false}>
      <AdminSearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Название или описание"
        accessibilityLabel="Поиск групп"
      />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : null}

      {error !== null && error !== undefined ? (
        <Text variant="body">{toAppError(error).message}</Text>
      ) : null}

      {data !== undefined && data.length === 0 ? (
        <Text variant="body">Групп пока нет.</Text>
      ) : null}

      {data !== undefined && data.length > 0 && filtered.length === 0 ? (
        <Text variant="body">По запросу ничего не найдено.</Text>
      ) : null}

      {filtered.length > 0 ? (
        <BlurCard>
          {filtered.map((group, index) => {
            const parentLabel =
              group.parentGroupId === null
                ? 'Без родителя'
                : `← ${parentNameById.get(group.parentGroupId) ?? '…'}`;
            return (
              <View key={group.id}>
                {index === 0 ? null : <Divider />}
                <ListRow
                  title={group.name}
                  subtitle={`${parentLabel} · ${group.descriptionRu}`}
                  icon={icons.people}
                  onPress={() => router.push(`/admin/groups/${group.id}` as Href)}
                />
              </View>
            );
          })}
        </BlurCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
});
