import { type Href, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { useServices } from '@/app/providers/ContainerProvider';
import { PixelartGeneratorLogo } from '@/design-system/brand/PixelartGeneratorLogo';
import { useThemeColors } from '@/design-system/colors/colors';
import { BlurCard } from '@/design-system/components/BlurCard/BlurCard';
import { Button } from '@/design-system/components/Button/Button';
import { Divider } from '@/design-system/components/Divider/Divider';
import { ListRow } from '@/design-system/components/ListRow/ListRow';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { icons, type IconName } from '@/design-system/icons/icons';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

import {
  describeDeviceSession,
  type DeviceSession,
  isPixelartGeneratorSession,
} from '../../domain/entities/DeviceSession';
import { useDeviceSessionActions } from '../hooks/useDeviceSessionActions';
import { useDeviceSessions } from '../hooks/useDeviceSessions';

function sessionGlyph(session: DeviceSession): IconName {
  if (isPixelartGeneratorSession(session) || session.platform === 'web') {
    return icons.desktop;
  }
  return icons.phone;
}

function SessionRow({
  session,
  now,
  onPress,
}: {
  readonly session: DeviceSession;
  readonly now: number;
  readonly onPress: () => void;
}): ReactElement {
  const copy = describeDeviceSession(session, now);

  if (isPixelartGeneratorSession(session)) {
    return (
      <ListRow
        title={copy.title}
        subtitle={copy.subtitle}
        leading={<PixelartGeneratorLogo size={20} />}
        onPress={onPress}
      />
    );
  }

  return (
    <ListRow
      title={copy.title}
      subtitle={copy.subtitle}
      icon={sessionGlyph(session)}
      onPress={onPress}
    />
  );
}

export function DevicesScreen(): ReactElement {
  const router = useRouter();
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const { current, others, isLoading, error } = useDeviceSessions();
  const actions = useDeviceSessionActions();
  const now = Date.now();

  const openSession = (sessionId: string): void => {
    router.push(`/devices/${sessionId}` as Href);
  };

  const confirmRevokeAll = (): void => {
    Alert.alert(
      'Выйти на всех устройствах?',
      'Все активные сессии, включая эту, будут завершены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти везде',
          style: 'destructive',
          onPress: () => {
            void actions.revokeAll();
          },
        },
      ],
    );
  };

  return (
    <Screen title="Устройства" reserveTabBar={false}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : error !== null && error !== undefined ? (
        <Text variant="body">{toAppError(error).message}</Text>
      ) : (
        <>
          <BlurCard title="Это устройство">
            {current === null ? (
              <Text variant="caption">Нет активной сессии на этом телефоне</Text>
            ) : (
              <SessionRow
                session={current}
                now={now}
                onPress={() => openSession(current.id)}
              />
            )}
          </BlurCard>

          <BlurCard title="Другие устройства">
            {others.length === 0 ? (
              <Text variant="caption">Нет других активных сессий</Text>
            ) : (
              others.map((session, index) => (
                <View key={session.id}>
                  {index === 0 ? null : <Divider />}
                  <SessionRow
                    session={session}
                    now={now}
                    onPress={() => openSession(session.id)}
                  />
                </View>
              ))
            )}
          </BlurCard>
        </>
      )}

      {isSandbox ? null : (
        <BlurCard>
          <ListRow
            title="Войти в Twilite Pixelart Generator"
            subtitle="Сканируйте QR в браузере"
            leading={<PixelartGeneratorLogo size={20} />}
            titleNumberOfLines={2}
            onPress={() => router.push('/qr-scan')}
          />
        </BlurCard>
      )}

      <Button
        label="Выйти на всех устройствах"
        variant="danger"
        loading={actions.isPending}
        onPress={confirmRevokeAll}
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
