import { useLocalSearchParams } from 'expo-router';
import { Fragment, type ReactElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useContainer, useServices } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import {
  SegmentedControl,
  type SegmentedControlOption,
} from '@/design-system/components/SegmentedControl/SegmentedControl';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

import type { AdminUserOverride } from '../../domain/entities/AdminModels';
import { resolvePermissionsByName } from '../../domain/services/permissionCatalog';
import { AdminSearchField } from '../components/AdminSearchField';
import { PermissionModuleList } from '../components/PermissionModuleList';
import { adminQueryKeys } from '../hooks/adminQueryKeys';
import { useAdminPermissions, useAdminUser } from '../hooks/useAdminQueries';

type OverrideChoice = 'none' | 'GRANT' | 'DENY';

const OVERRIDE_OPTIONS: readonly SegmentedControlOption<OverrideChoice>[] = [
  { value: 'none', label: 'Нет' },
  { value: 'GRANT', label: 'Выдать' },
  { value: 'DENY', label: 'Запретить' },
];

function overrideMap(overrides: readonly AdminUserOverride[]): Map<string, OverrideChoice> {
  const map = new Map<string, OverrideChoice>();
  for (const item of overrides) {
    map.set(item.permissionId, item.type);
  }
  return map;
}

export function AdminUserDetailScreen(): ReactElement {
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const { repositories } = useContainer();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = typeof params.id === 'string' ? params.id : null;

  const userQuery = useAdminUser(userId);
  const permissionsQuery = useAdminPermissions();

  const [draft, setDraft] = useState<Map<string, OverrideChoice>>(new Map());
  const [effectiveQuery, setEffectiveQuery] = useState('');
  const [overrideQuery, setOverrideQuery] = useState('');

  useEffect(() => {
    if (userQuery.data !== undefined) {
      setDraft(overrideMap(userQuery.data.overrides));
    }
  }, [userQuery.data]);

  const dirty = useMemo(() => {
    if (userQuery.data === undefined) {
      return false;
    }
    const original = overrideMap(userQuery.data.overrides);
    if (original.size !== draft.size) {
      return true;
    }
    for (const [id, value] of draft) {
      if (original.get(id) !== value) {
        return true;
      }
    }
    return false;
  }, [draft, userQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (userId === null) {
        throw new Error('Нет пользователя');
      }
      const overrides = [...draft.entries()]
        .filter(([, type]) => type !== 'none')
        .map(([permissionId, type]) => ({
          permissionId,
          type: type as 'GRANT' | 'DENY',
        }));
      return repositories.admin.setUserPermissions(userId, { overrides });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(adminQueryKeys.user(updated.id), updated);
      showToast('Переопределения сохранены');
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  if (isSandbox) {
    return (
      <Screen title="Пользователь" reserveTabBar={false}>
        <Text variant="body">Админ-панель недоступна в офлайн-режиме.</Text>
      </Screen>
    );
  }

  if (userQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <Screen title="Пользователь" reserveTabBar={false}>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  if (userQuery.error !== null || userQuery.data === undefined) {
    return (
      <Screen title="Пользователь" reserveTabBar={false}>
        <Text variant="body">{toAppError(userQuery.error ?? new Error('Не найден')).message}</Text>
      </Screen>
    );
  }

  const user = userQuery.data;
  const catalog = permissionsQuery.data ?? [];
  const effectivePermissions = resolvePermissionsByName(user.permissions, catalog);

  return (
    <Screen title={user.displayName} subtitle={user.email} reserveTabBar={false}>
      <BlurCard title="Группы">
        {user.groups.length === 0 ? (
          <Text variant="caption">Не состоит в группах</Text>
        ) : (
          user.groups.map((group, index) => (
            <Fragment key={group.id}>
              {index === 0 ? null : <Divider />}
              <ListRow title={group.name} />
            </Fragment>
          ))
        )}
      </BlurCard>

      <Text variant="sectionTitle">Эффективные права</Text>
      <AdminSearchField
        value={effectiveQuery}
        onChangeText={setEffectiveQuery}
        placeholder="Поиск по эффективным правам"
        accessibilityLabel="Поиск по эффективным правам"
      />
      <PermissionModuleList
        permissions={effectivePermissions}
        query={effectiveQuery}
        emptyLabel={
          effectiveQuery.trim().length > 0
            ? 'По запросу ничего не найдено'
            : 'Нет эффективных прав'
        }
        renderItem={(permission) => (
          <ListRow
            title={permission.descriptionRu}
            subtitle={permission.name}
            titleNumberOfLines={2}
          />
        )}
      />

      <Text variant="sectionTitle">Переопределения</Text>
      <Text variant="caption">
        GRANT добавляет право сверх групп, DENY запрещает даже при наличии в группе.
      </Text>
      <AdminSearchField
        value={overrideQuery}
        onChangeText={setOverrideQuery}
        placeholder="Поиск по каталогу прав"
        accessibilityLabel="Поиск переопределений"
      />
      <PermissionModuleList
        permissions={catalog}
        query={overrideQuery}
        emptyLabel={
          overrideQuery.trim().length > 0 ? 'По запросу ничего не найдено' : 'Каталог прав пуст'
        }
        renderItem={(permission) => {
          const value = draft.get(permission.id) ?? 'none';
          return (
            <View style={styles.overrideBlock}>
              <Text variant="bodyStrong">{permission.descriptionRu}</Text>
              <Text variant="caption">{permission.name}</Text>
              <SegmentedControl
                accessibilityLabel={`Переопределение ${permission.name}`}
                value={value}
                options={OVERRIDE_OPTIONS}
                onChange={(next) => {
                  setDraft((prev) => {
                    const copy = new Map(prev);
                    if (next === 'none') {
                      copy.delete(permission.id);
                    } else {
                      copy.set(permission.id, next);
                    }
                    return copy;
                  });
                }}
              />
            </View>
          );
        }}
      />

      <Button
        label={dirty ? 'Сохранить изменения' : 'Сохранить'}
        loading={saveMutation.isPending}
        disabled={!dirty || saveMutation.isPending}
        onPress={() => saveMutation.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
  overrideBlock: { gap: spacing.sm, paddingVertical: spacing.xs },
});
