import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '../../colors/colors';
import { spacing } from '../../spacing/spacing';
import { fontFamily, fontWeights } from '../../typography/fonts';
import { Text } from '../Text/Text';

export type SheetHeadingProps = {
  readonly title: string;
  readonly subtitle: string;
};

/** Centered title and subtitle shared by native form sheets. */
function SheetHeadingComponent({ title, subtitle }: SheetHeadingProps): ReactElement {
  const theme = useThemeColors();

  return (
    <View style={styles.header}>
      <Text align="center" style={styles.title} variant="bodyStrong">
        {title}
      </Text>
      <Text align="center" color={theme.textTertiary} style={styles.subtitle} variant="caption">
        {subtitle}
      </Text>
    </View>
  );
}

export const SheetHeading = memo(SheetHeadingComponent);

const styles = StyleSheet.create({
  header: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily('semiBold'),
    fontWeight: fontWeights.semiBold,
    fontSize: 16,
    marginTop: spacing.md,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 14,
    maxWidth: 322,
  },
});
