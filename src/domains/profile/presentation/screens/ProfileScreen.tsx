import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { useServices } from '@/app/providers/ContainerProvider';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { useAuthActions } from '@/domains/auth/presentation/hooks/useAuthActions';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { useSpaces } from '@/domains/spaces/presentation/hooks/useSpaces';

export function ProfileScreen(): ReactElement {
  const router = useRouter();
  const { isSandbox } = useServices();
  const { spaces, activeSpace } = useSpaces();
  const status = useAuthStore((state) => state.status);
  const auth = useAuthActions();

  return (
    <Screen title="Профиль">
      <BlurCard title={activeSpace?.title ?? 'Поле'}>
        <Text variant="caption">
          {spaces.length === 1 ? 'У вас одно пространство' : `У вас ${spaces.length} пространства`}
          {isSandbox ? ' · офлайн-режим без сервера' : ''}
        </Text>
      </BlurCard>

      <BlurCard>
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
      </BlurCard>

      {status === 'authenticated' ? (
        <Button label="Выйти" variant="secondary" loading={auth.isPending} onPress={auth.signOut} />
      ) : (
        <Button label="Войти" onPress={() => router.push('/sign-in')} />
      )}
    </Screen>
  );
}
