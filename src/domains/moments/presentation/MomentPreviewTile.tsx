import { memo, type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/design-system/colors/colors';
import { Text } from '@/design-system/components/Text/Text';

import type { MomentPreview } from '../domain/entities/MomentCatalog';
import { CoverImage, MomentSpriteView } from './MomentSpriteView';
import { momentCatalogLayout as layout } from './momentCatalogLayout';
import { type ImageHeaders, spriteLoops } from './spritePlayback';

export type MomentPreviewTileProps = {
  readonly moment: MomentPreview;
  readonly active: boolean;
  readonly allowMotion: boolean;
  readonly imageHeaders: ImageHeaders;
};

function MomentPreviewTileComponent({
  moment,
  active,
  allowMotion,
  imageHeaders,
}: MomentPreviewTileProps): ReactElement {
  const theme = useThemeColors();
  const [width, setWidth] = useState<number>(layout.tileWidth);

  return (
    <View accessibilityLabel={moment.name} style={styles.tile}>
      <View
        style={styles.art}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          setWidth((current) => (current === next ? current : next));
        }}
      >
        <MomentArt
          active={active}
          allowMotion={allowMotion}
          headers={imageHeaders}
          moment={moment}
          width={width}
        />
      </View>
      <View style={[styles.label, { backgroundColor: theme.surface }]}>
        <Text align="center" color={theme.textSecondary} numberOfLines={1} style={styles.name}>
          {moment.name}
        </Text>
      </View>
    </View>
  );
}

function MomentArt({
  moment,
  active,
  allowMotion,
  headers,
  width,
}: {
  readonly moment: MomentPreview;
  readonly active: boolean;
  readonly allowMotion: boolean;
  readonly headers: ImageHeaders;
  readonly width: number;
}): ReactElement | null {
  if (!active) return null;
  const sprite = moment.sprite;
  if (sprite !== null && allowMotion && spriteLoops(sprite)) {
    return <MomentSpriteView headers={headers} playing sprite={sprite} width={width} />;
  }
  if (moment.previewUrl !== null) return <CoverImage headers={headers} uri={moment.previewUrl} />;
  if (sprite === null) return null;
  return <MomentSpriteView headers={headers} playing={false} sprite={sprite} width={width} />;
}

export const MomentPreviewTile = memo(MomentPreviewTileComponent);

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    maxWidth: layout.tileWidth,
  },
  art: {
    height: layout.tileArtHeight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: layout.tileRadius,
    borderTopRightRadius: layout.tileRadius,
  },
  label: {
    height: layout.tileLabelHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: layout.tileRadius,
    borderBottomRightRadius: layout.tileRadius,
  },
  name: {
    fontSize: 8,
    lineHeight: 9,
  },
});
