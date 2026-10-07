import { memo, type ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';
import { fontFamily, fontWeights } from '@/design-system/typography/fonts';

import { CatalogSectionCard } from './CatalogSectionCard';
import { MomentPreviewRow } from './MomentPreviewRow';
import { MOMENT_CATALOG_COPY, type MomentPreview } from './momentCatalog';

export type RecentMomentsSectionProps = {
  readonly moments: readonly MomentPreview[];
};

function RecentMomentsSectionComponent({ moments }: RecentMomentsSectionProps): ReactElement {
  const theme = useThemeColors();

  return (
    <CatalogSectionCard>
      <Text align="center" color={theme.textPrimary} style={styles.title}>
        {MOMENT_CATALOG_COPY.recentTitle}
      </Text>
      <MomentPreviewRow active={false} allowMotion={false} imageHeaders={null} moments={moments} />
    </CatalogSectionCard>
  );
}

export const RecentMomentsSection = memo(RecentMomentsSectionComponent);

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamily('semiBold'),
    fontWeight: fontWeights.semiBold,
    fontSize: 10,
    lineHeight: 12,
  },
});
