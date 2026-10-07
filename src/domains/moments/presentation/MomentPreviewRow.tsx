import { memo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MomentPreview } from '../domain/entities/MomentCatalog';
import { MomentPreviewTile } from './MomentPreviewTile';
import { momentCatalogLayout as layout } from './momentCatalogLayout';
import type { ImageHeaders } from './spritePlayback';

export type MomentPreviewRowProps = {
  readonly moments: readonly MomentPreview[];
  readonly active: boolean;
  readonly allowMotion: boolean;
  readonly imageHeaders: ImageHeaders;
};

function MomentPreviewRowComponent({
  moments,
  active,
  allowMotion,
  imageHeaders,
}: MomentPreviewRowProps): ReactElement {
  return (
    <View style={styles.row}>
      {moments.map((moment) => (
        <MomentPreviewTile
          active={active}
          allowMotion={allowMotion}
          imageHeaders={imageHeaders}
          key={moment.id}
          moment={moment}
        />
      ))}
    </View>
  );
}

export const MomentPreviewRow = memo(MomentPreviewRowComponent);

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: layout.tileGap,
  },
});
