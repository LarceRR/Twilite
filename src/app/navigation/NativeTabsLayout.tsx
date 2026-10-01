import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';

import { getNativeTabIconSources } from './nativeTabIconSources';
import { CREATE_TAB_NAME, TAB_ROUTES } from './tabRoutes';
import { TabAvatarCircularBaker } from './TabAvatarCircularBaker';
import { useCachedTabAvatar } from './useCachedTabAvatar';

/**
 * Native Liquid Glass tab bar (iOS 26+).
 *
 * The trailing create control uses Apple's `role="search"` API — the same system
 * mechanism Telegram / News / Music use for the detached circular button beside
 * the main pill. Custom icon overrides the search glyph; the system keeps the
 * separated glass treatment.
 *
 * @see https://docs.expo.dev/router/advanced/native-tabs/#separate-search-tab
 * @see https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
 */
export function NativeTabsLayout(): ReactElement {
  const theme = useThemeColors();
  const avatarUrl = useAuthStore((state) => state.profile?.avatarUrl ?? null);
  const iconSources = getNativeTabIconSources();
  const tabAvatar = useCachedTabAvatar(avatarUrl);

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

        <NativeTabs.Trigger
          name={CREATE_TAB_NAME}
          role="search"
          accessibilityLabel="Добавить"
        >
          <NativeTabs.Trigger.Icon sf="plus" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
