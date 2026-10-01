import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { PixelartGeneratorLogo } from '@/design-system/brand/PixelartGeneratorLogo';
import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { icons } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

import {
  appKindLabel,
  describeDeviceSession,
  formatSessionDateTime,
  isPixelartGeneratorSession,
  platformDetailLabel,
} from '../../domain/entities/DeviceSession';
import { useDeviceSessionActions } from '../hooks/useDeviceSessionActions';
import { useDeviceSessions } from '../hooks/useDeviceSessions';

function DetailRow({
  title,
  value,
}: {
  readonly title: string;
  readonly value: string;
}): ReactElement {
  return <ListRow title={title} subtitle={value} />;
}

export function DeviceSessionDetailScreen(): ReactElement {
  const router = useRouter();
  const theme = useThemeColors();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : null;
  const profile = useAuthStore((state) => state.profile);
  const { current, others, isLoading } = useDeviceSessions();
  const actions = useDeviceSessionActions();
  const now = Date.now();

  const sessions = current === null ? others : [current, ...others];
  const session = sessions.find((item) => item.id === sessionId) ?? null;

  if (isLoading && session === null) {
    return (
      <Screen title="Сессия" reserveTabBar={false}>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  if (session === null) {
    return (
      <Screen title="Сессия" reserveTabBar={false}>
        <Text variant="body">Сессия не найдена или уже завершена.</Text>
        <Button label="К устройствам" variant="secondary" onPress={() => router.replace('/devices' as Href)} />
      </Screen>
    );
  }

  const copy = describeDeviceSession(session, now);
  const accountName = profile?.displayName ?? 'Вы';
  const accountEmail =
    profile?.email === null || profile?.email === undefined ? null : String(profile.email);

  const confirmRevoke = (): void => {
    Alert.alert(
      session.current ? 'Выйти из этой сессии?' : 'Завершить сессию?',
      session.current
        ? 'Вы выйдете из приложения на этом устройстве.'
        : 'Устройство сразу потеряет доступ к аккаунту.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: session.current ? 'Выйти' : 'Завершить',
          style: 'destructive',
          onPress: () => {
            void actions.revokeSession(session.id, { current: session.current }).then(() => {
              if (!session.current) {
                router.replace('/devices' as Href);
              }
            });
          },
        },
      ],
    );
  };

  return (
    <Screen title="Сессия" subtitle={copy.title} reserveTabBar={false}>
      <BlurCard>
        {isPixelartGeneratorSession(session) ? (
          <ListRow
            title={copy.title}
            subtitle={session.current ? 'Текущее устройство' : 'Активная сессия'}
            leading={<PixelartGeneratorLogo size={20} />}
          />
        ) : (
          <ListRow
            title={copy.title}
            subtitle={session.current ? 'Текущее устройство' : 'Активная сессия'}
            icon={session.platform === 'web' ? icons.desktop : icons.phone}
          />
        )}
      </BlurCard>

      <BlurCard title="Аккаунт">
        <DetailRow title="Пользователь" value={accountName} />
        {accountEmail === null ? null : (
          <>
            <Divider />
            <DetailRow title="Почта" value={accountEmail} />
          </>
        )}
      </BlurCard>

      <BlurCard title="Устройство">
        <DetailRow title="Приложение" value={appKindLabel(session)} />
        <Divider />
        <DetailRow title="Платформа" value={platformDetailLabel(session.platform)} />
        <Divider />
        <DetailRow
          title="Модель"
          value={session.model !== null && session.model.length > 0 ? session.model : '—'}
        />
        <Divider />
        <DetailRow
          title="Версия"
          value={
            session.appVersion !== null && session.appVersion.length > 0 ? session.appVersion : '—'
          }
        />
        <Divider />
        <DetailRow
          title="Адрес"
          value={session.ipLabel !== null && session.ipLabel.length > 0 ? session.ipLabel : 'Не сохранён'}
        />
      </BlurCard>

      <BlurCard title="Активность">
        <DetailRow title="Создана" value={formatSessionDateTime(session.createdAt)} />
        <Divider />
        <DetailRow title="Последняя активность" value={formatSessionDateTime(session.lastUsedAt)} />
        <Divider />
        <DetailRow title="Истекает" value={formatSessionDateTime(session.expiresAt)} />
        <Divider />
        <DetailRow title="ID сессии" value={session.id} />
      </BlurCard>

      <Button
        label={session.current ? 'Выйти на этом устройстве' : 'Завершить сессию'}
        variant="danger"
        loading={actions.isPending}
        onPress={confirmRevoke}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
});
