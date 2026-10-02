import type { TextStyle } from 'react-native';

import { colors } from '../colors/colors';
import { type FontWeightToken, fontFamily, fontWeights } from './fonts';

function style(
  size: number,
  lineHeight: number,
  weight: FontWeightToken,
  letterSpacing: number,
  color: string = colors.textPrimary,
): TextStyle {
  return {
    fontFamily: fontFamily(weight),
    fontWeight: fontWeights[weight],
    fontSize: size,
    lineHeight,
    letterSpacing,
    color,
  };
}

export const typography = {
  display: style(34, 40, 'semiBold', -0.6),
  screenTitle: style(22, 28, 'semiBold', -0.3),
  sectionTitle: style(20, 26, 'semiBold', -0.2),
  body: style(16, 22, 'regular', 0),
  bodyStrong: style(16, 22, 'medium', 0),
  caption: style(13, 18, 'regular', 0.1, colors.textSecondary),
  captionStrong: style(13, 18, 'medium', 0.1),
  label: style(15, 20, 'medium', 0.1),
  tabLabel: style(11, 14, 'medium', 0.1),
  numeric: style(15, 20, 'medium', 0.4),
} as const;

export type TypographyVariant = keyof typeof typography;
