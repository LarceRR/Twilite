import { memo, type ReactElement } from 'react';

import type { MomentPack } from '../domain/entities/MomentCatalog';
import { CatalogSectionCard } from './CatalogSectionCard';
import { MomentPackHeader } from './MomentPackHeader';
import { MomentPreviewRow } from './MomentPreviewRow';
import type { ImageHeaders } from './spritePlayback';

export type MomentPackSectionProps = {
  readonly pack: MomentPack;
  readonly active: boolean;
  readonly allowMotion: boolean;
  readonly imageHeaders: ImageHeaders;
};

function MomentPackSectionComponent({
  pack,
  active,
  allowMotion,
  imageHeaders,
}: MomentPackSectionProps): ReactElement {
  return (
    <CatalogSectionCard>
      <MomentPackHeader imageHeaders={imageHeaders} pack={pack} />
      <MomentPreviewRow
        active={active}
        allowMotion={allowMotion}
        imageHeaders={imageHeaders}
        moments={pack.moments}
      />
    </CatalogSectionCard>
  );
}

export const MomentPackSection = memo(MomentPackSectionComponent);
