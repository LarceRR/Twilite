import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { type ReactElement, useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/design-system/colors/colors';
import { Button } from '@/design-system/components/Button/Button';
import { Text } from '@/design-system/components/Text/Text';
import { radius } from '@/design-system/radius/radius';
import { layout, spacing } from '@/design-system/spacing/spacing';

import { parseQrLoginPayload } from '../../domain/services/qrLoginPayload';
import { usePendingQrLoginStore } from '../stores/pendingQrLoginStore';

export function QrScanScreen(): ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const setPendingToken = usePendingQrLoginStore((state) => state.setToken);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const onScanned = useCallback(
    (result: { readonly data: string }) => {
      if (scanned) {
        return;
      }

      const token = parseQrLoginPayload(result.data);
      if (token === null) {
        setInvalid(true);
        return;
      }

      setScanned(true);
      setPendingToken(token);
      router.replace('/qr-confirm');
    },
    [router, scanned, setPendingToken],
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
        <Text variant="screenTitle">Сканер QR</Text>
        <Text variant="body">Сканирование доступно в приложении на телефоне.</Text>
        <Button label="Назад" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  if (permission === null) {
    return <View style={[styles.root, { backgroundColor: theme.surface }]} />;
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.fallback,
          {
            backgroundColor: theme.surface,
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <Text variant="screenTitle">Камера</Text>
        <Text variant="body">Чтобы войти в Twilite Pixelart Generator, разрешите доступ к камере.</Text>
        <Button label="Разрешить камеру" onPress={() => void requestPermission()} />
        <Button label="Отмена" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        facing="back"
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : onScanned}
      />
      <View
        pointerEvents="box-none"
        style={[styles.overlay, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Text variant="screenTitle" color={theme.textInverted} align="center">
          Наведите на QR
        </Text>
        <Text variant="caption" color={theme.textInverted} align="center">
          Код входа из Twilite Pixelart Generator
        </Text>
        <View style={styles.frame} />
        {invalid ? (
          <Text variant="caption" color={theme.textInverted} align="center">
            Это не код входа Twilite
          </Text>
        ) : null}
        <Button label="Отмена" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fallback: {
    flex: 1,
    paddingHorizontal: layout.screenGutter,
    gap: spacing.lg,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenGutter,
    gap: spacing.md,
  },
  frame: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
});
