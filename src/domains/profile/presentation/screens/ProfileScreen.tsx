import { type Href, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useServices } from '@/app/providers/ContainerProvider';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { UserAvatar } from '@/design-system/components/UserAvatar/UserAvatar';
import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';
import { Can } from '@/domains/admin/presentation/components/Can';
import { useAuthActions } from '@/domains/auth/presentation/hooks/useAuthActions';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';

import { useAvatarActions } from '../hooks/useAvatarActions';

export function ProfileScreen(): ReactElement {
  const router = useRouter();
  const { isSandbox } = useServices();
  const { spaces, activeSpace } = useSpaces();
  const status = useAuthStore((state) => state.status);
  const profile = useAuthStore((state) => state.profile);
  const auth = useAuthActions();
  const avatars = useAvatarActions();

  const displayName = profile?.displayName ?? 'Гость';
  const email =
    profile?.email ?? (status === 'authenticated' ? 'Почта не указана' : 'Войдите в аккаунт');

  return (
    <Screen title="Профиль">
      <BlurCard>
        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Изменить фото профиля"
            disabled={status !== 'authenticated' || avatars.isBusy}
            onPress={avatars.openAvatarMenu}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <UserAvatar
              name={displayName}
              imageUrl={profile?.avatarUrl ?? null}
              seed={profile?.id ?? displayName}
              size={56}
            />
          </Pressable>
          <View style={styles.identityText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {displayName}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>
      </BlurCard>

      <BlurCard title={activeSpace?.title ?? 'Поле'}>
        <Text variant="caption">
          {spaces.length === 1 ? 'У вас одно пространство' : `У вас ${spaces.length} пространства`}
          {isSandbox ? ' · офлайн-режим без сервера' : ''}
        </Text>
      </BlurCard>

      <BlurCard>
        <ListRow
          title="Устройства"
          subtitle="Сессии и вход с компьютера"
          icon={icons.phone}
          onPress={() => router.push('/devices' as Href)}
        />
        <Divider />
        <ListRow
          title="Настройки"
          subtitle="Тема, сцена, анимации"
          icon={icons.settings}
          onPress={() => router.push('/settings')}
        />
        <Divider />
        <ListRow
          title="Доступ"
          subtitle="Расширенные возможности"
          icon={icons.billing}
          onPress={() => router.push('/billing')}
        />
        {isSandbox ? null : (
          <Can permission="ta.adminPanel.access">
            <Divider />
            <ListRow
              title="Админ-панель"
              subtitle="Пользователи, группы и права"
              icon={icons.shield}
              onPress={() => router.push('/admin' as Href)}
            />
          </Can>
        )}
      </BlurCard>

      {status === 'authenticated' ? (
        <Button label="Выйти" variant="secondary" loading={auth.isPending} onPress={auth.signOut} />
      ) : (
        <Button label="Войти" onPress={() => router.push('/sign-in')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: 0.7,
  },
});
