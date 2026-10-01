import { useLocalSearchParams } from 'expo-router';
import { Fragment, type ReactElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { useContainer, useServices } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Modal } from '@/design-system/components/Modal/Modal';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Switch } from '@/design-system/components/Switch/Switch';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';
import { typography } from '@/design-system/typography/typography';
import { toAppError } from '@/shared/errors';

import {
  collectAncestorPermissionIds,
  eligibleParentGroups,
} from '../../domain/services/groupInheritance';
import { AdminSearchField } from '../components/AdminSearchField';
import { Can } from '../components/Can';
import { PermissionModuleList } from '../components/PermissionModuleList';
import { adminQueryKeys } from '../hooks/adminQueryKeys';
import { useAdminGroup, useAdminGroups, useAdminPermissions } from '../hooks/useAdminQueries';

export function AdminGroupEditScreen(): ReactElement {
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const { repositories } = useContainer();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const params = useLocalSearchParams<{ id?: string }>();
  const groupId = typeof params.id === 'string' ? params.id : null;

  const groupQuery = useAdminGroup(groupId);
  const groupsQuery = useAdminGroups();
  const permissionsQuery = useAdminPermissions();

  const [name, setName] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);
  const [permissionIds, setPermissionIds] = useState<Set<string>>(new Set());
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [permissionQuery, setPermissionQuery] = useState('');

  useEffect(() => {
    if (groupQuery.data === undefined) {
      return;
    }
    setName(groupQuery.data.name);
    setDescriptionEn(groupQuery.data.descriptionEn);
    setDescriptionRu(groupQuery.data.descriptionRu);
    setParentGroupId(groupQuery.data.parentGroupId);
    setPermissionIds(new Set(groupQuery.data.permissionIds));
  }, [groupQuery.data]);

  const parentCandidates = useMemo(() => {
    if (groupId === null || groupsQuery.data === undefined) {
      return [];
    }
    return eligibleParentGroups(groupId, groupsQuery.data);
  }, [groupId, groupsQuery.data]);

  const parentLabel = useMemo(() => {
    if (parentGroupId === null) {
      return 'Без родителя';
    }
    return groupsQuery.data?.find((group) => group.id === parentGroupId)?.name ?? parentGroupId;
  }, [groupsQuery.data, parentGroupId]);

  const inheritedPermissionIds = useMemo(() => {
    if (groupsQuery.data === undefined) {
      return new Set<string>();
    }
    return collectAncestorPermissionIds(parentGroupId, groupsQuery.data);
  }, [groupsQuery.data, parentGroupId]);

  const ownPermissions = useMemo(() => {
    const catalog = permissionsQuery.data ?? [];
    return catalog.filter((permission) => !inheritedPermissionIds.has(permission.id));
  }, [inheritedPermissionIds, permissionsQuery.data]);

  const inheritedPermissions = useMemo(() => {
    const catalog = permissionsQuery.data ?? [];
    return catalog.filter((permission) => inheritedPermissionIds.has(permission.id));
  }, [inheritedPermissionIds, permissionsQuery.data]);

  const dirty = useMemo(() => {
    const group = groupQuery.data;
    if (group === undefined) {
      return false;
    }
    if (
      name !== group.name ||
      descriptionEn !== group.descriptionEn ||
      descriptionRu !== group.descriptionRu ||
      parentGroupId !== group.parentGroupId
    ) {
      return true;
    }
    if (permissionIds.size !== group.permissionIds.length) {
      return true;
    }
    return group.permissionIds.some((id) => !permissionIds.has(id));
  }, [descriptionEn, descriptionRu, groupQuery.data, name, parentGroupId, permissionIds]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (groupId === null) {
        throw new Error('Нет группы');
      }
      return repositories.admin.updateGroup(groupId, {
        name: name.trim(),
        descriptionEn: descriptionEn.trim(),
        descriptionRu: descriptionRu.trim(),
        parentGroupId,
        permissionIds: [...permissionIds],
      });
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(adminQueryKeys.group(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups() });
      showToast('Группа сохранена');
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });

  if (isSandbox) {
    return (
      <Screen title="Группа" reserveTabBar={false}>
        <Text variant="body">Админ-панель недоступна в офлайн-режиме.</Text>
      </Screen>
    );
  }

  if (groupQuery.isLoading || groupsQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <Screen title="Группа" reserveTabBar={false}>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  if (groupQuery.error !== null || groupQuery.data === undefined) {
    return (
      <Screen title="Группа" reserveTabBar={false}>
        <Text variant="body">{toAppError(groupQuery.error ?? new Error('Не найдена')).message}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={groupQuery.data.name} subtitle="Редактирование группы" reserveTabBar={false}>
      <BlurCard title="Наследование">
        <Text variant="caption">
          Права родителя и предков действуют автоматически, пока связь не снята. Снять галочки в
          «Своих правах» не отключает унаследованные.
        </Text>
        <ListRow
          title={parentGroupId === null ? 'Родитель не задан' : `Наследует от: ${parentLabel}`}
          subtitle={
            parentGroupId === null
              ? 'Группа использует только свои прямые права'
              : 'Нажмите, чтобы сменить родителя'
          }
          onPress={() => setParentPickerOpen(true)}
        />
        {parentGroupId === null ? null : (
          <>
            <Divider />
            <ListRow
              title="Отвязать от родителя"
              subtitle={`Убрать наследование от «${parentLabel}»`}
              onPress={() => setParentGroupId(null)}
            />
          </>
        )}
      </BlurCard>

      <BlurCard title="Описание">
        <View style={styles.field}>
          <Text variant="captionStrong">Название</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              { color: theme.textPrimary, backgroundColor: theme.surfaceSunken },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text variant="captionStrong">Описание (EN)</Text>
          <TextInput
            value={descriptionEn}
            onChangeText={setDescriptionEn}
            multiline
            style={[
              styles.input,
              styles.multiline,
              { color: theme.textPrimary, backgroundColor: theme.surfaceSunken },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text variant="captionStrong">Описание (RU)</Text>
          <TextInput
            value={descriptionRu}
            onChangeText={setDescriptionRu}
            multiline
            style={[
              styles.input,
              styles.multiline,
              { color: theme.textPrimary, backgroundColor: theme.surfaceSunken },
            ]}
          />
        </View>
      </BlurCard>

      <AdminSearchField
        value={permissionQuery}
        onChangeText={setPermissionQuery}
        placeholder="Поиск по правам"
        accessibilityLabel="Поиск по правам группы"
      />

      <Text variant="sectionTitle">Свои права</Text>
      <PermissionModuleList
        permissions={ownPermissions}
        query={permissionQuery}
        emptyLabel={
          permissionQuery.trim().length > 0
            ? 'По запросу ничего не найдено'
            : 'Нет прав вне наследования'
        }
        renderItem={(permission) => {
          const checked = permissionIds.has(permission.id);
          return (
            <ListRow
              title={permission.descriptionRu}
              subtitle={permission.name}
              titleNumberOfLines={2}
              trailing={
                <Switch
                  value={checked}
                  accessibilityLabel={permission.name}
                  onValueChange={(next) => {
                    setPermissionIds((prev) => {
                      const copy = new Set(prev);
                      if (next) {
                        copy.add(permission.id);
                      } else {
                        copy.delete(permission.id);
                      }
                      return copy;
                    });
                  }}
                />
              }
            />
          );
        }}
      />

      {inheritedPermissions.length === 0 ? null : (
        <>
          <Text variant="sectionTitle">От родителя</Text>
          <Text variant="caption">
            Только просмотр. Чтобы убрать — отвяжите родителя выше и сохраните.
          </Text>
          <PermissionModuleList
            permissions={inheritedPermissions}
            query={permissionQuery}
            emptyLabel="По запросу нет унаследованных прав"
            renderItem={(permission) => (
              <ListRow
                title={permission.descriptionRu}
                subtitle={`${permission.name} · от предка`}
                titleNumberOfLines={2}
                trailing={
                  <Switch
                    value
                    disabled
                    accessibilityLabel={`${permission.name} унаследовано`}
                    onValueChange={() => undefined}
                  />
                }
              />
            )}
          />
        </>
      )}

      <Can permission="ta.adminPanel.groups.edit">
        <Button
          label={dirty ? 'Сохранить изменения' : 'Сохранить'}
          loading={saveMutation.isPending}
          disabled={!dirty || saveMutation.isPending || name.trim().length === 0}
          onPress={() => saveMutation.mutate()}
        />
      </Can>

      <Modal
        visible={parentPickerOpen}
        onClose={() => setParentPickerOpen(false)}
        title="Наследует права от..."
        heightFraction={0.55}
      >
        <ListRow
          title="Без родителя"
          subtitle="Только прямые права этой группы"
          trailing={
            parentGroupId === null ? (
              <Ionicons name={icons.checkmark} size={20} color={theme.accent} />
            ) : undefined
          }
          onPress={() => {
            setParentGroupId(null);
            setParentPickerOpen(false);
          }}
        />
        <Divider />
        {parentCandidates.map((group, index) => (
          <Fragment key={group.id}>
            {index === 0 ? null : <Divider />}
            <ListRow
              title={group.name}
              subtitle={group.descriptionRu}
              trailing={
                parentGroupId === group.id ? (
                  <Ionicons name={icons.checkmark} size={20} color={theme.accent} />
                ) : undefined
              }
              onPress={() => {
                setParentGroupId(group.id);
                setParentPickerOpen(false);
              }}
            />
          </Fragment>
        ))}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
  field: { gap: spacing.xs, marginBottom: spacing.md },
  input: {
    ...typography.body,
    minHeight: layout.controlHeight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: layout.controlHeight * 1.6,
    textAlignVertical: 'top',
  },
});
