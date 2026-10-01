import { type ReactElement } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { PixelObjectDto } from '@/shared/contracts/pixelObjects';
import { useThemeColors } from '@/design-system/colors/colors';
import { radius } from '@/design-system/radius/radius';

type PixelCatalogPreviewProps = {
  readonly item: Pick<PixelObjectDto, 'previewUrl' | 'sheetUrl' | 'title'>;
  readonly size?: number;
};

/** Static catalog preview — prefers server previewUrl (P4-S8). */
export function PixelCatalogPreview({
  item,
  size = 96,
}: PixelCatalogPreviewProps): ReactElement {
  const theme = useThemeColors();
  const uri = item.previewUrl ?? item.sheetUrl;

  if (uri == null || uri.length === 0) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, backgroundColor: theme.surfaceSunken },
        ]}
      />
    );
  }

  return (
    <Image
      accessibilityLabel={item.title}
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius.sm }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: radius.sm,
  },
});
