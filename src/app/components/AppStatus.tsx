import { useEffect, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { useThemeColors } from '@/design-system/colors/colors';
import { useAppStatusStore } from '../status/appStatusStore';
import { useAppStatusLifecycle } from '../status/useAppStatusLifecycle';
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);
export function AppStatus(): ReactElement | null {
  const source = useAppStatusStore((s) => s.status);
  const status = useAppStatusLifecycle(source);
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const wave = useSharedValue(-1);
  useEffect(() => {
    if (status?.kind === 'processing')
      wave.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    else wave.value = -1;
    return () => {
      wave.value = -1;
    };
  }, [status?.kind, wave]);
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${wave.value * 100}%` }],
  }));
  if (status === null || status.phase === 'exit') return null;
  const color = status.kind === 'error' ? theme.negative : theme.textSecondary;
  const mask = (
    <Text variant="captionStrong" color={color}>
      {status.message}
    </Text>
  );
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <MaskedView maskElement={mask}>
        <View style={styles.textWrap}>
          <Text variant="captionStrong" color={color}>
            {status.message}
          </Text>
          {status.kind === 'processing' ? (
            <AnimatedGradient
              colors={['transparent', `${color}66`, 'transparent']}
              style={[styles.wave, waveStyle]}
            />
          ) : null}
        </View>
      </MaskedView>
    </View>
  );
}
const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 20,
  },
  textWrap: { position: 'relative' },
  wave: { ...StyleSheet.absoluteFill, width: '65%' },
});
