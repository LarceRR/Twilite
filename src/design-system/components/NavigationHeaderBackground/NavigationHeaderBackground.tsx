import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useIsDarkTheme, useThemeColors, withAlpha } from '../../colors/colors';

/**
 * Fade both the Liquid Glass-like tint and the blur out toward the bottom edge.
 * iOS gets a gradient-masked native blur; other platforms keep the color fade
 * without paying for a blur layer that is not consistently supported there.
 */
export function NavigationHeaderBackground(): ReactElement {
  const theme = useThemeColors();
  const isDark = useIsDarkTheme();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={['#FFFFFF', '#FFFFFF00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <BlurView
            intensity={64}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      ) : null}
      <LinearGradient
        colors={[withAlpha(theme.surface, 0.78), withAlpha(theme.surface, 0)]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
