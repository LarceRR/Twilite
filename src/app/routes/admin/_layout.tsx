import { Redirect, Slot } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useServices } from '@/app/providers/ContainerProvider';
import { useHasPermission } from '@/domains/admin/presentation/components/Can';
import { AdminForbiddenScreen } from '@/domains/admin/presentation/screens/AdminHubScreen';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { useThemeColors } from '@/design-system/colors/colors';

/**
 * Gates the whole admin stack on ta.adminPanel.access.
 * Sandbox / missing permission → Forbidden screen (no nested routes).
 */
export default function AdminLayout(): ReactElement {
  const theme = useThemeColors();
  const { isSandbox } = useServices();
  const status = useAuthStore((state) => state.status);
  const profile = useAuthStore((state) => state.profile);
  const canAccess = useHasPermission('ta.adminPanel.access');

  if (status !== 'authenticated') {
    return <Redirect href="/sign-in" />;
  }

  if (isSandbox) {
    return <AdminForbiddenScreen reason="sandbox" />;
  }

  if (profile === null) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  if (!canAccess) {
    return <AdminForbiddenScreen />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
