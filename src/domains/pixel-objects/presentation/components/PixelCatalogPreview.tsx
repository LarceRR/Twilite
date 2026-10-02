import { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PixelObjectDto } from '@/shared/contracts/pixelObjects';
import { useThemeColors } from '@/design-system/colors/colors';
import { radius } from '@/design-system/radius/radius';

import { PixelSheetPreview } from './PixelSheetPreview';

type PixelCatalogPreviewProps = {
  readonly item: Pick<PixelObjectDto, 'sheetUrl' | 'manifest' | 'title'>;
  readonly size?: number;
};

/**
 * Catalog card preview: one frame from the sheet, animated when the clip has
 * multiple frames. Never renders the raw spritesheet as a plain Image.
 */
export function PixelCatalogPreview({
  item,
  size = 96,
}: PixelCatalogPreviewProps): ReactElement {
  const theme = useThemeColors();

  if (item.sheetUrl.length === 0) {
    return (
      <View
        accessibilityLabel={item.title}
        style={[
          styles.fallback,
          { width: size, height: size, backgroundColor: theme.surfaceSunken },
        ]}
      />
    );
  }

  return <PixelSheetPreview item={item} size={size} animate />;
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: radius.sm,
  },
});
