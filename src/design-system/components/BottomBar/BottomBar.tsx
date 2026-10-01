import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactElement, type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTabGlyphs } from '@/app/navigation/tabRoutes';

import { useThemeColors } from '../../colors/themeStore';
import type { IconName } from '../../icons/icons';
import { durations } from '../../motion/durations';
import { reanimatedEasing } from '../../motion/easings';
import { radius } from '../../radius/radius';
import { layout, spacing } from '../../spacing/spacing';
import { FloatingAddButton } from '../FloatingAddButton/FloatingAddButton';
import { GlassSurface } from '../GlassSurface/GlassSurface';

const ICON_SIZE = 26;

export type BottomBarIconParams = {
  readonly routeName: string;
  readonly focused: boolean;
  readonly color: string;
  readonly size: number;
};

/** Local shape so we stay compatible with expo-router's forked tab-bar props. */
export type BottomBarProps = {
  readonly state: {
    readonly index: number;
    readonly routes: readonly {
      readonly key: string;
      readonly name: string;
      readonly params?: object | undefined;
    }[];
  };
  readonly descriptors: Readonly<
    Record<
      string,
      {
        readonly options?: {
          readonly tabBarLabel?: unknown;
          readonly title?: unknown;
          readonly tabBarAccessibilityLabel?: string;
        };
      }
    >
  >;
  readonly navigation: {
    emit: (event: {
      type: 'tabPress' | 'tabLongPress';
      target: string;
      canPreventDefault?: boolean;
    }) => unknown;
    navigate: (name: string, params?: object) => void;
  };
  readonly renderIcon?: (p: BottomBarIconParams) => ReactNode;
  readonly onAddPress?: () => void;
  readonly addAccessibilityLabel?: string;
};

type TabGlyphs = { readonly active: IconName; readonly inactive: IconName };

type TabItemProps = {
  readonly focused: boolean;
  readonly label: string;
  readonly glyphs: TabGlyphs;
  readonly icon: ReactNode;
  readonly onPress: () => void;
  readonly onLongPress: () => void;
  readonly accessibilityLabel: string | undefined;
};

function TabItem({
  focused,
  label,
  glyphs,
  icon,
  onPress,
  onLongPress,
  accessibilityLabel,
}: TabItemProps): ReactElement {
  const theme = useThemeColors();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: durations.fast,
      easing: reanimatedEasing('standard'),
    });
  }, [focused, progress]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * spacing.xxs }],
  }));
  const labelStyle = useAnimatedStyle(
    () => ({
      color: interpolateColor(progress.value, [0, 1], [theme.controlInactive, theme.controlActive]),
    }),
    [theme.controlInactive, theme.controlActive],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={iconStyle}>
        {icon ?? (
          <Ionicons
            name={focused ? glyphs.active : glyphs.inactive}
            size={ICON_SIZE}
            color={focused ? theme.controlActive : theme.controlInactive}
          />
        )}
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/**
 * Telegram-style dock: compressed tabs pill (left) + separate add control (right).
 * Layout only — each control keeps its own Liquid Glass surface.
 */
function BottomBarComponent({
  state,
  descriptors,
  navigation,
  renderIcon,
  onAddPress,
  addAccessibilityLabel = 'Добавить',
}: BottomBarProps): ReactElement {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const showAdd = onAddPress !== undefined;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      <View style={styles.row}>
        {/* flex host so GlassView still shrinks when the add control takes width */}
        <View style={showAdd ? styles.tabsHost : styles.tabsHostFull}>
          <GlassSurface cornerRadius={radius.xl} interactive style={styles.tabsPill}>
            <View style={styles.tabs}>
              {state.routes.map((route, index) => {
                const descriptor = descriptors[route.key];
                const options = descriptor?.options;
                const label =
                  typeof options?.tabBarLabel === 'string'
                    ? options.tabBarLabel
                    : typeof options?.title === 'string'
                      ? options.title
                      : route.name;
                const focused = state.index === index;
                const color = focused ? theme.controlActive : theme.controlInactive;
                const icon =
                  renderIcon === undefined
                    ? null
                    : (renderIcon({
                        routeName: route.name,
                        focused,
                        color,
                        size: ICON_SIZE,
                      }) ?? null);
                return (
                  <TabItem
                    key={route.key}
                    focused={focused}
                    label={label}
                    glyphs={getTabGlyphs(route.name)}
                    icon={icon}
                    accessibilityLabel={options?.tabBarAccessibilityLabel}
                    onPress={() => {
                      const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                      }) as { readonly defaultPrevented?: boolean };
                      if (state.index !== index && !event.defaultPrevented)
                        navigation.navigate(route.name, route.params);
                    }}
                    onLongPress={() => {
                      navigation.emit({ type: 'tabLongPress', target: route.key });
                    }}
                  />
                );
              })}
            </View>
          </GlassSurface>
        </View>

        {showAdd ? (
          <View style={styles.addHost}>
            <FloatingAddButton
              accessibilityLabel={addAccessibilityLabel}
              expanded={false}
              size={layout.tabBarHeight}
              onPress={onAddPress}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const BottomBar = memo(BottomBarComponent);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: layout.tabBarInset,
    right: layout.tabBarInset,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tabsHost: {
    flex: 1,
    minWidth: 0,
  },
  tabsHostFull: {
    flex: 1,
  },
  tabsPill: {
    width: '100%',
    minHeight: layout.tabBarHeight,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.tabBarHeight,
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    minWidth: 0,
  },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 0.1, fontWeight: '500' },
  addHost: {
    width: layout.tabBarHeight,
    height: layout.tabBarHeight,
    flexShrink: 0,
  },
});
