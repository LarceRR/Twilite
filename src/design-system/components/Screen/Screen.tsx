import { useHeaderHeight } from 'expo-router/react-navigation';
import { Stack, useIsFocused, usePathname, useRouter } from 'expo-router';
import { memo, type ReactElement, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isTabRootPath, resolvePageTitle } from '@/app/navigation/pageConfig';
import { reservesFloatingTabBar, tabScreenBottomPadding } from '@/app/navigation/tabBarLayout';

import { useThemeColors } from '../../colors/themeStore';
import { icons } from '../../icons/icons';
import { layout, spacing } from '../../spacing/spacing';
import { IconButton } from '../IconButton/IconButton';
import { NavigationHeaderBackground } from '../NavigationHeaderBackground/NavigationHeaderBackground';
import { Text } from '../Text/Text';
import { screenHeaderTitle } from './screenHeaderTitle';
import { screenTopPadding } from './screenTopPadding';
import { shouldShowScreenBack } from './shouldShowScreenBack';

export type ScreenProps = {
  readonly children: ReactNode;
  readonly title?: string;
  readonly subtitle?: string;
  readonly scroll?: boolean;
  /** Reserve room for the floating tab bar so content is never occluded. */
  readonly reserveTabBar?: boolean;
  /** Hide the back control even when the stack can go back. */
  readonly hideBack?: boolean;
  /** Skip status-bar top inset (native form sheets already sit below chrome). */
  readonly skipTopSafeArea?: boolean;
  /** Skip the chrome title, including the route-title fallback. */
  readonly hideHeader?: boolean;
  /** Horizontal inset. Sheets that specify their own gutter pass it here. */
  readonly contentGutter?: number;
  /** Optional trailing action in the native navigation header. */
  readonly headerRight?: ReactNode;
  /** Opt a tab root into its own nested native-stack header. */
  readonly enableNativeHeader?: boolean;
};

function ScreenComponent({
  children,
  title,
  subtitle,
  scroll = true,
  reserveTabBar = reservesFloatingTabBar(),
  hideBack = false,
  skipTopSafeArea = false,
  hideHeader = false,
  contentGutter = layout.screenGutter,
  headerRight,
  enableNativeHeader = false,
}: ScreenProps): ReactElement {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const resolvedTitle = screenHeaderTitle(hideHeader, title, resolvePageTitle(pathname));
  // Regular pushed pages use the platform navigation header. Tab roots and
  // native sheets retain their custom chrome, while iOS owns the back animation.
  const useNativeHeader =
    resolvedTitle !== undefined &&
    !skipTopSafeArea &&
    (enableNativeHeader || !isTabRootPath(pathname));
  const useGradientNativeHeader = useNativeHeader && Platform.OS === 'ios';
  // A tab root opted into its own nested Stack already has its header accounted
  // for by that stack. Adding a second spacer doubles the top blank area.
  const needsManualHeaderInset = useGradientNativeHeader && !enableNativeHeader;
  const showBack = shouldShowScreenBack({
    hideBack,
    isFocused,
    isTabRoot: isTabRootPath(pathname),
    canGoBack: router.canGoBack(),
  });
  const bottomPadding = tabScreenBottomPadding(insets.bottom, reserveTabBar);
  const topPadding = screenTopPadding(insets.top, skipTopSafeArea || useNativeHeader);
  const background = { backgroundColor: theme.surface };

  const nativeHeader = useNativeHeader ? (
    <Stack.Screen
      options={{
        headerShown: true,
        title: resolvedTitle,
        headerTitleAlign: 'center',
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: !hideBack && !isTabRootPath(pathname),
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { color: theme.textPrimary },
        headerShadowVisible: false,
        ...(Platform.OS === 'ios'
          ? {
              headerTransparent: true,
              headerBackground: () => <NavigationHeaderBackground />,
              headerStyle: { backgroundColor: 'transparent' },
            }
          : { headerStyle: { backgroundColor: theme.surface } }),
        ...(headerRight === undefined ? {} : { headerRight: () => headerRight }),
      }}
    />
  ) : null;

  const contentSubtitle =
    useNativeHeader && subtitle !== undefined ? (
      <Text variant="caption" color={theme.textSecondary} style={styles.contentSubtitle}>
        {subtitle}
      </Text>
    ) : null;

  const customHeader =
    useNativeHeader || resolvedTitle === undefined ? null : (
      <View style={styles.header}>
        <View style={[styles.titleRow, showBack ? styles.titleRowWithBack : null]}>
          {showBack ? (
            <View style={styles.backHost}>
              <IconButton
                icon={icons.chevronBack}
                accessibilityLabel="Назад"
                size={22}
                onPress={() => router.back()}
              />
            </View>
          ) : null}
          <View style={styles.titleText}>
            <Text variant="screenTitle">{resolvedTitle}</Text>
            {subtitle === undefined ? null : (
              <Text variant="caption" style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </View>
    );

  if (!scroll) {
    return (
      <>
        {nativeHeader}
        <View
          style={[
            styles.root,
            background,
            { paddingTop: useGradientNativeHeader ? 0 : topPadding },
          ]}
        >
          {needsManualHeaderInset ? <NativeHeaderInset /> : null}
          {customHeader}
          <View
            style={[
              styles.flexBody,
              { paddingBottom: bottomPadding, paddingHorizontal: contentGutter },
            ]}
          >
            {contentSubtitle}
            {children}
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {nativeHeader}
      <ScrollView
        style={[styles.root, background]}
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingTop: useGradientNativeHeader ? 0 : topPadding,
            paddingBottom: bottomPadding,
            paddingHorizontal: contentGutter,
          },
        ]}
        contentInsetAdjustmentBehavior={
          Platform.OS === 'ios' && !useNativeHeader && !reserveTabBar ? 'automatic' : 'never'
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {needsManualHeaderInset ? <NativeHeaderInset /> : null}
        {customHeader}
        {contentSubtitle}
        {children}
      </ScrollView>
    </>
  );
}

function NativeHeaderInset(): ReactElement {
  const headerHeight = useHeaderHeight();
  return <View style={{ height: headerHeight }} />;
}

export const Screen = memo(ScreenComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollBody: {
    paddingHorizontal: layout.screenGutter,
    gap: spacing.lg,
  },
  flexBody: {
    flex: 1,
    paddingHorizontal: layout.screenGutter,
    gap: spacing.lg,
  },
  header: {
    paddingBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  /** Pull the chevron flush with the screen edge (cancel content gutter). */
  titleRowWithBack: {
    marginLeft: -layout.screenGutter,
  },
  backHost: {
    marginRight: -spacing.xs,
  },
  titleText: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  subtitle: {
    maxWidth: layout.maxContentWidth,
  },
  contentSubtitle: {
    maxWidth: layout.maxContentWidth,
  },
});
