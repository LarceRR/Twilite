import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  useSystemColorSchemeSync,
  useThemeColors,
} from '@/design-system/colors/themeStore';

import { ContainerProvider } from './ContainerProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { QueryProvider } from './QueryProvider';

function ThemeSync({ children }: { readonly children: ReactNode }): ReactElement {
  useSystemColorSchemeSync();
  return <>{children}</>;
}

function ThemedGestureRoot({ children }: { readonly children: ReactNode }): ReactElement {
  const theme = useThemeColors();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.surface }]}>
      {children}
    </GestureHandlerRootView>
  );
}

export function AppProviders({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <ThemedGestureRoot>
      <SafeAreaProvider>
        <ActionSheetProvider>
          <ThemeSync>
            <ErrorBoundary>
              <ContainerProvider>
                <QueryProvider>{children}</QueryProvider>
              </ContainerProvider>
            </ErrorBoundary>
          </ThemeSync>
        </ActionSheetProvider>
      </SafeAreaProvider>
    </ThemedGestureRoot>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
