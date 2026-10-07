import * as Sentry from '@sentry/react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useBootstrap } from '@/app/bootstrap/useBootstrap';
import { AppStatus } from '@/app/components/AppStatus';
import { ToastHost } from '@/app/components/ToastHost';
import { createNavigationTheme } from '@/app/navigation/createNavigationTheme';
import { CREATE_SHEET_SCREEN_OPTIONS } from '@/app/navigation/createSheetOptions';
import { MOMENT_CATALOG_SHEET_OPTIONS } from '@/app/navigation/momentCatalogSheetOptions';
import { MOMENT_FILTERS_SHEET_OPTIONS } from '@/app/navigation/momentFiltersSheetOptions';
import { useAuthRedirect } from '@/app/navigation/useAuthRedirect';
import { AppProviders } from '@/app/providers/AppProviders';
import {
  useColorSchemeToken,
  useIsDarkTheme,
  useSystemColorSchemeSync,
  useThemeColors,
} from '@/design-system/colors/colors';
import { useHydrateAuthProfile } from '@/domains/auth/presentation/hooks/useHydrateAuthProfile';
import { useSessionIntegrity } from '@/domains/auth/presentation/hooks/useSessionIntegrity';

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

/** Keep tabs underneath when deep-linking straight into the create sheet. */
export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator(): ReactElement {
  const { isReady } = useBootstrap();
  const theme = useThemeColors();
  useAuthRedirect(isReady);
  useSessionIntegrity(isReady);
  useHydrateAuthProfile(isReady);
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
        <Stack.Screen name="create" options={CREATE_SHEET_SCREEN_OPTIONS} />
        <Stack.Screen name="moment-catalog" options={MOMENT_CATALOG_SHEET_OPTIONS} />
        <Stack.Screen name="moment-filters" options={MOMENT_FILTERS_SHEET_OPTIONS} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="theme-catalog" options={{ presentation: 'card' }} />
        <Stack.Screen name="devices" options={{ presentation: 'card' }} />
        <Stack.Screen name="billing" options={{ presentation: 'card' }} />
        <Stack.Screen name="admin" options={{ presentation: 'card' }} />
        <Stack.Screen name="qr-scan" options={{ presentation: 'card' }} />
        <Stack.Screen name="qr-confirm" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
      </Stack>
      <AppStatus />
      <ToastHost />
    </>
  );
}
function NavigationTheme({ children }: { readonly children: ReactNode }): ReactElement {
  const theme = useThemeColors();
  const dark = useIsDarkTheme();
  return <ThemeProvider value={createNavigationTheme(theme, dark)}>{children}</ThemeProvider>;
}

function RootLayout(): ReactElement {
  useSystemColorSchemeSync();
  const scheme = useColorSchemeToken();
  return (
    <AppProviders>
      <NavigationTheme>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationTheme>
    </AppProviders>
  );
}
export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
