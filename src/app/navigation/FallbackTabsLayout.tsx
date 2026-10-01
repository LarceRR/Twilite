import { Tabs, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { useThemeColors } from '@/design-system/colors/colors';
import { BottomBar } from '@/design-system/components/BottomBar/BottomBar';
import { UserAvatar } from '@/design-system/components/UserAvatar/UserAvatar';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

import { CREATE_TAB_NAME, isMainTabRoute, TAB_ROUTES } from './tabRoutes';

/** Floating glass tab bar shared across Android and non-native targets. */
export function FallbackTabsLayout(): ReactElement {
  const theme = useThemeColors();
  const profile = useAuthStore((state) => state.profile);
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => {
        const mainRoutes = props.state.routes.filter((route) => isMainTabRoute(route.name));
        const focusedRoute = props.state.routes[props.state.index];
        const focusedMainIndex = mainRoutes.findIndex((route) => route.key === focusedRoute?.key);

        return (
          <BottomBar
            {...props}
            state={{
              ...props.state,
              routes: mainRoutes,
              index: focusedMainIndex < 0 ? 0 : focusedMainIndex,
            }}
            addAccessibilityLabel="Добавить"
            onAddPress={() => router.push(`/${CREATE_TAB_NAME}`)}
            renderIcon={({ routeName, focused, color, size }) =>
              routeName === 'profile' ? (
                <UserAvatar
                  name={profile?.displayName ?? 'Профиль'}
                  seed={profile?.id ?? 'me'}
                  imageUrl={profile?.avatarUrl ?? null}
                  size={size}
                  ringColor={focused ? color : null}
                  ringWidth={1.5}
                />
              ) : null
            }
          />
        );
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.surface },
      }}
    >
      {TAB_ROUTES.map((route) => (
        <Tabs.Screen key={route.name} name={route.name} options={{ title: route.title }} />
      ))}
      <Tabs.Screen name={CREATE_TAB_NAME} options={{ href: null, title: 'Добавить' }} />
    </Tabs>
  );
}
