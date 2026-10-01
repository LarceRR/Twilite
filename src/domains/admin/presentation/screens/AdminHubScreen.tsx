import { type Href, useRouter } from 'expo-router';
import { Fragment, type ReactElement } from 'react';

import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { icons, type IconName } from '@/design-system/icons/icons';

import { useHasPermission } from '../components/Can';

type HubLink = {
  readonly permission: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: IconName;
  readonly href: Href;
};

const HUB_LINKS: readonly HubLink[] = [
  {
    permission: 'ta.adminPanel.users.view',
    title: 'Пользователи',
    subtitle: 'Группы и переопределения прав',
    icon: icons.profile,
    href: '/admin/users' as Href,
  },
  {
    permission: 'ta.adminPanel.permissions.view',
    title: 'Каталог прав',
    subtitle: 'Поиск и просмотр по модулям',
    icon: icons.shield,
    href: '/admin/permissions' as Href,
  },
  {
    permission: 'ta.adminPanel.groups.view',
    title: 'Группы и наследование',
    subtitle: 'Родители, свои и унаследованные права',
    icon: icons.people,
    href: '/admin/groups' as Href,
  },
];

export function AdminHubScreen(): ReactElement {
  const router = useRouter();
  const canUsers = useHasPermission('ta.adminPanel.users.view');
  const canPermissions = useHasPermission('ta.adminPanel.permissions.view');
  const canGroups = useHasPermission('ta.adminPanel.groups.view');

  const allowedByPermission: Record<string, boolean> = {
    'ta.adminPanel.users.view': canUsers,
    'ta.adminPanel.permissions.view': canPermissions,
    'ta.adminPanel.groups.view': canGroups,
  };

  const visible = HUB_LINKS.filter((link) => allowedByPermission[link.permission] === true);

  return (
    <Screen title="Админ-панель" subtitle="Платформенные права" reserveTabBar={false}>
      <BlurCard>
        {visible.length === 0 ? (
          <Text variant="caption">Нет доступных разделов</Text>
        ) : (
          visible.map((link, index) => (
            <Fragment key={link.permission}>
              {index === 0 ? null : <Divider />}
              <ListRow
                title={link.title}
                subtitle={link.subtitle}
                icon={link.icon}
                onPress={() => router.push(link.href)}
              />
            </Fragment>
          ))
        )}
      </BlurCard>

      <Text variant="caption" align="center">
        Изменения применяются сразу и влияют на эффективные права пользователей.
      </Text>
    </Screen>
  );
}

export function AdminForbiddenScreen({
  reason = 'permission',
}: {
  readonly reason?: 'permission' | 'sandbox';
} = {}): ReactElement {
  const router = useRouter();

  return (
    <Screen title="Нет доступа" reserveTabBar={false}>
      <BlurCard title="Админ-панель">
        <Text variant="body">
          {reason === 'sandbox'
            ? 'Админ-панель недоступна в офлайн-режиме без сервера.'
            : 'У вашей учётной записи нет права ta.adminPanel.access. Обратитесь к администратору.'}
        </Text>
      </BlurCard>
      <Button label="Назад" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
