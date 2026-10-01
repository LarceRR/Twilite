import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { memo, type ReactElement, type ReactNode } from 'react';
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useIsDarkTheme, useThemeColors } from '../../colors/themeStore';
import { radius } from '../../radius/radius';
import { shadows } from '../../shadows/shadows';

export type GlassSurfaceProps = {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly cornerRadius?: number;
  readonly interactive?: boolean;
};

/**
 * Resolved once at module scope: the capability cannot change at runtime, and
 * probing it per render costs a native bridge call on every frame of a list.
 */
export const LIQUID_GLASS_AVAILABLE = (() => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

/** True when a control can render as real system Liquid Glass. */
export function isLiquidGlassSurfaceAvailable(): boolean {
  return LIQUID_GLASS_AVAILABLE;
}

const BLUR_INTENSITY = Platform.OS === 'ios' ? 80 : 24;

/**
 * iOS 26+ uses native Liquid Glass. Older iOS uses a system material blur.
 * Android blurs are expensive and banded, so it gets a translucent fill with a
 * hairline rim, which reads the same at tab-bar scale for a fraction of the cost.
 */
function GlassSurfaceComponent({
  children,
  style,
  cornerRadius = radius.xl,
  interactive = false,
}: GlassSurfaceProps): ReactElement {
  const theme = useThemeColors();
  const isDark = useIsDarkTheme();

  if (LIQUID_GLASS_AVAILABLE) {
    const scheme = isDark ? 'dark' : 'light';
    return (
      <GlassView
        key={`glass-${scheme}`}
        style={[{ borderRadius: cornerRadius }, style]}
        glassEffectStyle="regular"
        colorScheme={scheme}
        tintColor={theme.glassTint}
        isInteractive={interactive}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.shell,
          shadows.medium,
          {
            borderRadius: cornerRadius,
            backgroundColor: theme.glassFillAndroid,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.glassRimAndroid,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.shell, shadows.medium, { borderRadius: cornerRadius }, style]}>
      <BlurView
        intensity={BLUR_INTENSITY}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.rim, { borderRadius: cornerRadius, borderColor: theme.glassRim }]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export const GlassSurface = memo(GlassSurfaceComponent);

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  rim: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    zIndex: 1,
  },
});
