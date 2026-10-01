import { type Href, useRouter } from 'expo-router';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useUseCases } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { useThemeColors } from '@/design-system/colors/colors';
import { Button } from '@/design-system/components/Button/Button';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { toAppError } from '@/shared/errors';

import { describeQrRequestingDevice, type QrLoginPreview } from '../../domain/entities/QrLoginPreview';
import { useQrLoginActions } from '../hooks/useQrLoginActions';
import { useAuthStore } from '../stores/authStore';
import { usePendingQrLoginStore } from '../stores/pendingQrLoginStore';

type ConfirmState =
  | { readonly kind: 'missing' }
  | { readonly kind: 'needs-auth' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly preview: QrLoginPreview }
  | { readonly kind: 'approved' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'error'; readonly message: string };

export function QrLoginConfirmScreen(): ReactElement {
  const router = useRouter();
  const theme = useThemeColors();
  const status = useAuthStore((state) => state.status);
  const token = usePendingQrLoginStore((state) => state.token);
  const setPendingToken = usePendingQrLoginStore((state) => state.setToken);
  const { inspectQrLogin } = useUseCases();
  const qr = useQrLoginActions();
  const showToast = useUiStore((state) => state.showToast);
  const [state, setState] = useState<ConfirmState>({ kind: 'loading' });
  const inspectedFor = useRef<string | null>(null);

  useEffect(() => {
    if (token === null) {
      setState((current) =>
        current.kind === 'approved' || current.kind === 'denied' ? current : { kind: 'missing' },
      );
      return;
    }

    if (status === 'restoring') {
      setState({ kind: 'loading' });
      return;
    }

    if (status !== 'authenticated') {
      setState({ kind: 'needs-auth' });
      return;
    }

    if (inspectedFor.current === token) {
      return;
    }

    inspectedFor.current = token;
    setState({ kind: 'loading' });

    void inspectQrLogin(token)
      .then((preview) => {
        setState({ kind: 'ready', preview });
      })
      .catch((error: unknown) => {
        inspectedFor.current = null;
        setState({ kind: 'error', message: toAppError(error).message });
      });
  }, [inspectQrLogin, status, token]);

  const decide = (decision: 'approve' | 'deny'): void => {
    if (token === null) {
      return;
    }

    void (decision === 'approve' ? qr.approve(token) : qr.deny(token))
      .then(() => {
        setState({ kind: decision === 'approve' ? 'approved' : 'denied' });
        setPendingToken(null);
        showToast(
          decision === 'approve'
            ? 'Вход в Twilite Pixelart Generator подтверждён'
            : 'Вход в Twilite Pixelart Generator отклонён',
          decision === 'approve' ? 'positive' : 'neutral',
        );
        router.replace('/devices' as Href);
      })
      .catch(() => {
        // Toast is already shown by the hook.
      });
  };

  if (state.kind === 'needs-auth') {
    return (
      <Screen
        title="Вход в Pixelart Generator"
        subtitle="Сначала войдите в приложение, затем подтвердите этот QR"
        reserveTabBar={false}
      >
        <Button label="Войти" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (state.kind === 'missing') {
    return (
      <Screen title="Вход в Pixelart Generator" reserveTabBar={false}>
        <Text variant="body">Код входа не найден. Отсканируйте QR ещё раз.</Text>
        <Button label="Сканировать" onPress={() => router.replace('/qr-scan')} />
      </Screen>
    );
  }

  if (state.kind === 'loading') {
    return (
      <Screen title="Вход в Pixelart Generator" reserveTabBar={false}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  if (state.kind === 'error') {
    return (
      <Screen title="Вход в Pixelart Generator" reserveTabBar={false}>
        <Text variant="body">{state.message}</Text>
        <Button
          label="Сканировать снова"
          onPress={() => {
            setPendingToken(null);
            router.replace('/qr-scan');
          }}
        />
      </Screen>
    );
  }

  if (state.kind === 'approved' || state.kind === 'denied') {
    return (
      <Screen title="Вход в Pixelart Generator" reserveTabBar={false}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.textSecondary} />
          <Text variant="body" align="center">
            {state.kind === 'approved'
              ? 'Вход в Twilite Pixelart Generator подтверждён'
              : 'Вход в Twilite Pixelart Generator отклонён'}
          </Text>
        </View>
      </Screen>
    );
  }

  const copy = describeQrRequestingDevice(state.preview.requestingDevice);

  return (
    <Screen
      title="Подтвердить вход"
      subtitle="Разрешите вход только если это вы"
      reserveTabBar={false}
    >
      <Text variant="sectionTitle">{copy.title}</Text>
      <Text variant="caption">{copy.subtitle}</Text>
      <View style={styles.actions}>
        <Button
          label="Разрешить"
          loading={qr.isPending}
          onPress={() => decide('approve')}
        />
        <Button
          label="Отклонить"
          variant="secondary"
          disabled={qr.isPending}
          onPress={() => decide('deny')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.lg,
  },
  actions: { gap: spacing.md },
});
