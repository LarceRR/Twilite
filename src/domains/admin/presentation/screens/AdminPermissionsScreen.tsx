import { type ReactElement, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useServices } from '@/app/providers/ContainerProvider';
import { useThemeColors } from '@/design-system/colors/colors';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

import { AdminSearchField } from '../components/AdminSearchField';
import { PermissionModuleList } from '../components/PermissionModuleList';
import { useAdminPermissions } from '../hooks/useAdminQueries';

export function AdminPermissionsScreen(): ReactElement {
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const { data, isLoading, error } = useAdminPermissions();
  const [query, setQuery] = useState('');

  if (isSandbox) {
    return (
      <Screen title="Права" reserveTabBar={false}>
        <Text variant="body">Админ-панель недоступна в офлайн-режиме.</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Каталог прав" subtitle="Только просмотр" reserveTabBar={false}>
      <AdminSearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Имя, модуль или описание"
        accessibilityLabel="Поиск по правам"
      />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : null}

      {error !== null && error !== undefined ? (
        <Text variant="body">{toAppError(error).message}</Text>
      ) : null}

      {data !== undefined ? (
        <PermissionModuleList
          permissions={data}
          query={query}
          emptyLabel={
            query.trim().length > 0 ? 'По запросу ничего не найдено' : 'Каталог прав пуст'
          }
          renderItem={(permission) => (
            <ListRow
              title={permission.descriptionRu}
              subtitle={permission.name}
              titleNumberOfLines={2}
            />
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
});
