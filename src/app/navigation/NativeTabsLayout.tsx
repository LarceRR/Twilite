import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthenticatedAssetHeaders } from '@/app/hooks/useAuthenticatedAssetHeaders';
import { useThemeColors } from '@/design-system/colors/colors';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

import { getNativeTabIconSources } from './nativeTabIconSources';
import { TabAvatarCircularBaker } from './TabAvatarCircularBaker';
import { TAB_ROUTES } from './tabRoutes';
import { useCachedTabAvatar } from './useCachedTabAvatar';

/**
 * Native Liquid Glass tab bar (iOS 26+).
 *
 */
export function NativeTabsLayout(): ReactElement {
  const theme = useThemeColors();
  const avatarUrl = useAuthStore((state) => state.profile?.avatarUrl ?? null);
  const imageHeaders = useAuthenticatedAssetHeaders();
  const iconSources = getNativeTabIconSources();
  const tabAvatar = useCachedTabAvatar(avatarUrl, imageHeaders);

  if (iconSources === null) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  return (
    <>
      {tabAvatar.bake === null ? null : (
        <TabAvatarCircularBaker
          sourceUri={tabAvatar.bake.sourceUri}
          destUri={tabAvatar.bake.destUri}
          scale={tabAvatar.bake.scale}
          onReady={tabAvatar.onBakeReady}
          onError={tabAvatar.onBakeError}
        />
      )}

      <NativeTabs
        minimizeBehavior="never"
        disableTransparentOnScrollEdge
        iconColor={{ default: theme.textSecondary, selected: theme.accent }}
      >
        {TAB_ROUTES.map((route) => {
          const glyphs = iconSources[route.name];
          const usePhoto = route.name === 'profile' && tabAvatar.source !== null;

          return (
            <NativeTabs.Trigger key={route.name} name={route.name}>
              <NativeTabs.Trigger.Label>{route.title}</NativeTabs.Trigger.Label>
              {usePhoto ? (
                <NativeTabs.Trigger.Icon src={tabAvatar.source} renderingMode="original" />
              ) : (
                <NativeTabs.Trigger.Icon
                  src={{ default: glyphs.default, selected: glyphs.selected }}
                />
              )}
            </NativeTabs.Trigger>
          );
        })}
      </NativeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
