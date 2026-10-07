import { useIsFocused, usePathname, useRouter } from 'expo-router';
import { memo, type ReactElement, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isTabRootPath, resolvePageTitle } from '@/app/navigation/pageConfig';
import { reservesFloatingTabBar, tabScreenBottomPadding } from '@/app/navigation/tabBarLayout';

import { useThemeColors } from '../../colors/themeStore';
import { icons } from '../../icons/icons';
import { layout, spacing } from '../../spacing/spacing';
import { IconButton } from '../IconButton/IconButton';
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
}: ScreenProps): ReactElement {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const resolvedTitle = screenHeaderTitle(hideHeader, title, resolvePageTitle(pathname));
  const showBack = shouldShowScreenBack({
    hideBack,
    isFocused,
    isTabRoot: isTabRootPath(pathname),
    canGoBack: router.canGoBack(),
  });
  const bottomPadding = tabScreenBottomPadding(insets.bottom, reserveTabBar);
  const topPadding = screenTopPadding(insets.top, skipTopSafeArea);
  const background = { backgroundColor: theme.surface };

  const header =
    resolvedTitle === undefined ? null : (
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
      <View style={[styles.root, background, { paddingTop: topPadding }]}>
        {header}
        <View
          style={[
            styles.flexBody,
            { paddingBottom: bottomPadding, paddingHorizontal: contentGutter },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, background]}
      contentContainerStyle={[
        styles.scrollBody,
        { paddingTop: topPadding, paddingBottom: bottomPadding, paddingHorizontal: contentGutter },
      ]}
      contentInsetAdjustmentBehavior={
        Platform.OS === 'ios' && !reserveTabBar ? 'automatic' : 'never'
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      {children}
    </ScrollView>
  );
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
});
