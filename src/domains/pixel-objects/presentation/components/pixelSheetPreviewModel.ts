import type { PixelObjectDto, PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';

export type PixelSheetPreviewModel = {
  readonly sheetUrl: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly staticPreviewFrame: number;
  readonly clip: readonly { readonly frame: number; readonly durationMs: number }[];
};

export function previewModelFromCatalogItem(
  item: Pick<PixelObjectDto, 'sheetUrl' | 'manifest'>,
): PixelSheetPreviewModel {
  const { manifest, sheetUrl } = item;
  return {
    sheetUrl,
    frameWidth: manifest.sheet.frameWidth,
    frameHeight: manifest.sheet.frameHeight,
    columns: manifest.sheet.columns,
    rows: manifest.sheet.rows,
    staticPreviewFrame: manifest.staticPreviewFrame,
    clip: manifest.animations[0]?.frames ?? [],
  };
}

export function previewModelFromMobile(dto: PixelObjectMobileDto): PixelSheetPreviewModel {
  return {
    sheetUrl: dto.sheetUrl,
    frameWidth: dto.sheet.frameWidth,
    frameHeight: dto.sheet.frameHeight,
    columns: dto.sheet.columns,
    rows: dto.sheet.rows,
    staticPreviewFrame: dto.staticPreviewFrame,
    clip: dto.animations[0]?.frames ?? [],
  };
}
