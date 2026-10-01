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
import { useAdminUsers } from '../hooks/useAdminQueries';

export function AdminUsersScreen(): ReactElement {
  const router = useRouter();
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const { data, isLoading, error } = useAdminUsers();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const users = data ?? [];
    if (needle.length === 0) {
      return users;
    }
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle),
    );
  }, [data, query]);

  if (isSandbox) {
    return (
      <Screen title="Пользователи" reserveTabBar={false}>
        <Text variant="body">Админ-панель недоступна в офлайн-режиме.</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Пользователи" subtitle="Группы и переопределения" reserveTabBar={false}>
      <AdminSearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Имя или email"
        accessibilityLabel="Поиск пользователей"
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
        <Text variant="body">Пользователей пока нет.</Text>
      ) : null}

      {data !== undefined && data.length > 0 && filtered.length === 0 ? (
        <Text variant="body">По запросу ничего не найдено.</Text>
      ) : null}

      {filtered.length > 0 ? (
        <BlurCard>
          {filtered.map((user, index) => (
            <View key={user.id}>
              {index === 0 ? null : <Divider />}
              <ListRow
                title={user.displayName}
                subtitle={user.email}
                icon={icons.profile}
                onPress={() => router.push(`/admin/users/${user.id}` as Href)}
              />
            </View>
          ))}
        </BlurCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
});
