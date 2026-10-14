import { memo, type ReactElement } from 'react';

import type { MomentPack, MomentPreview } from '../domain/entities/MomentCatalog';
import { CatalogSectionCard } from './CatalogSectionCard';
import { MomentPackHeader } from './MomentPackHeader';
import { MomentPreviewRow } from './MomentPreviewRow';
import type { ImageHeaders } from './spritePlayback';

export type MomentPackSectionProps = {
  readonly pack: MomentPack;
  readonly active: boolean;
  readonly allowMotion: boolean;
  readonly imageHeaders: ImageHeaders;
  readonly disabled: boolean;
  readonly onSelect: (moment: MomentPreview) => void;
};

function MomentPackSectionComponent({
  pack,
  active,
  allowMotion,
  imageHeaders,
  disabled,
  onSelect,
}: MomentPackSectionProps): ReactElement {
  return (
    <CatalogSectionCard>
      <MomentPackHeader imageHeaders={imageHeaders} pack={pack} />
      <MomentPreviewRow
        active={active}
        allowMotion={allowMotion}
        imageHeaders={imageHeaders}
        moments={pack.moments}
        disabled={disabled}
        onSelect={onSelect}
      />
    </CatalogSectionCard>
  );
}

export const MomentPackSection = memo(MomentPackSectionComponent);
