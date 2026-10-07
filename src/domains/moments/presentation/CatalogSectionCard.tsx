import { memo, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';

import { momentCatalogLayout as layout } from './momentCatalogLayout';

export type CatalogSectionCardProps = {
  readonly children: ReactNode;
};

/** Sunken card shared by the recent row and every pack. */
function CatalogSectionCardComponent({ children }: CatalogSectionCardProps): ReactElement {
  const theme = useThemeColors();

  return <View style={[styles.card, { backgroundColor: theme.surfaceSunken }]}>{children}</View>;
}

export const CatalogSectionCard = memo(CatalogSectionCardComponent);

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: layout.cardRadius,
    paddingTop: layout.cardPaddingTop,
    paddingBottom: layout.cardPaddingBottom,
    paddingHorizontal: layout.cardPaddingX,
    gap: layout.cardGap,
  },
});
