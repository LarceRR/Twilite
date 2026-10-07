import { memo, type ReactElement } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColors } from '@/design-system/colors/colors';
import type { ThemeColors } from '@/design-system/colors/themes';
import { usePressFeedback } from '@/design-system/components/Pressable/usePressFeedback';
import { Text } from '@/design-system/components/Text/Text';
import { spacing } from '@/design-system/spacing/spacing';
import { fontFamily, fontWeights } from '@/design-system/typography/fonts';

import type { CreateMomentOption } from './createMomentOptions';

const CARD_RADIUS = 16;
const CARD_MIN_HEIGHT = 167;
const ART_HEIGHT = 64;

export type MomentOptionCardProps = {
  readonly option: CreateMomentOption;
  readonly art: ImageSourcePropType;
  readonly onSelect: () => void;
};

function MomentOptionCardComponent({ option, art, onSelect }: MomentOptionCardProps): ReactElement {
  const theme = useThemeColors();
  const feedback = usePressFeedback();

  return (
    <Animated.View style={[styles.host, feedback.animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={option.title}
        onPress={onSelect}
        onPressIn={feedback.onPressIn}
        onPressOut={feedback.onPressOut}
        style={[styles.card, cardFrame(option.emphasized, theme)]}
      >
        <Image accessible={false} resizeMode="contain" source={art} style={styles.art} />
        <OptionCopy option={option} />
      </Pressable>
    </Animated.View>
  );
}

function cardFrame(emphasized: boolean, theme: ThemeColors): ViewStyle {
  return {
    backgroundColor: theme.surfaceRaised,
    borderColor: emphasized ? theme.accentSoft : 'transparent',
  };
}

function OptionCopy({ option }: { readonly option: CreateMomentOption }): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.copy}>
      <Text align="center" style={styles.cardTitle} variant="label">
        {option.title}
      </Text>
      <Text align="center" color={theme.textTertiary} style={styles.description} variant="caption">
        {option.description}
      </Text>
    </View>
  );
}

export const MomentOptionCard = memo(MomentOptionCardComponent);

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  card: {
    flex: 1,
    minHeight: CARD_MIN_HEIGHT,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  art: {
    width: '100%',
    height: ART_HEIGHT,
  },
  copy: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  cardTitle: {
    fontFamily: fontFamily('semiBold'),
    fontWeight: fontWeights.semiBold,
    fontSize: 14,
    lineHeight: 16,
  },
  description: {
    fontSize: 10,
    lineHeight: 12,
  },
});
