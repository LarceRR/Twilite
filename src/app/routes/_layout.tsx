import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useBootstrap } from '@/app/bootstrap/useBootstrap';
import { AppStatus } from '@/app/components/AppStatus';
import { ToastHost } from '@/app/components/ToastHost';
import { useAuthRedirect } from '@/app/navigation/useAuthRedirect';
import { AppProviders } from '@/app/providers/AppProviders';
import {
  useColorSchemeToken,
  useSystemColorSchemeSync,
  useThemeColors,
} from '@/design-system/colors/colors';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://90eb33488b62d60e3c9eb7ff062a3131@o4511900762439680.ingest.us.sentry.io/4511900781379584',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function RootNavigator(): ReactElement {
  const { isReady } = useBootstrap();
  const theme = useThemeColors();
  useAuthRedirect(isReady);
  if (!isReady)
    return (
      <View style={[styles.splash, { backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.textSecondary} size="large" />
      </View>
    );
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.surface },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="billing" options={{ presentation: 'card' }} />
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
      </Stack>
      <AppStatus />
      <ToastHost />
    </>
  );
}
function RootLayout(): ReactElement {
  useSystemColorSchemeSync();
  const scheme = useColorSchemeToken();
  return (
    <AppProviders>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </AppProviders>
  );
}
export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
