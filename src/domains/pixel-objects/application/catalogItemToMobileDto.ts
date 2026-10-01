import type { PixelObjectDto, PixelObjectMobileDto } from '@/shared/contracts/pixelObjects';

/** Published catalog row → mobile player DTO (same sheet, no extra round-trip). */
export function catalogItemToMobileDto(item: PixelObjectDto): PixelObjectMobileDto {
  const { manifest } = item;
  return {
    id: item.id,
    title: item.title,
    format: manifest.format,
    sheetUrl: item.sheetUrl,
    canvas: manifest.canvas,
    sheet: {
      frameWidth: manifest.sheet.frameWidth,
      frameHeight: manifest.sheet.frameHeight,
      columns: manifest.sheet.columns,
      rows: manifest.sheet.rows,
      frameCount: manifest.sheet.frameCount,
    },
    animations: manifest.animations,
    staticPreviewFrame: manifest.staticPreviewFrame,
  };
}
