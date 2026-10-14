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
  readonly disabled: boolean;
  readonly onSelect: (moment: MomentPreview) => void;
};

function MomentPreviewRowComponent({
  moments,
  active,
  allowMotion,
  imageHeaders,
  disabled,
  onSelect,
}: MomentPreviewRowProps): ReactElement {
  return (
    <View style={styles.row}>
      {moments.map((moment) => (
        <MomentPreviewTile
          active={active}
          allowMotion={allowMotion}
          imageHeaders={imageHeaders}
          disabled={disabled}
          key={moment.id}
          moment={moment}
          onSelect={onSelect}
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
