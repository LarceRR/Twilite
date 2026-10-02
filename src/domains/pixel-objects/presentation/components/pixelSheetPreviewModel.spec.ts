import { describe, expect, it } from 'vitest';

import { PIXEL_OBJECT_FORMAT } from '@/shared/contracts/limits';
import type { PixelObjectDto } from '@/shared/contracts/pixelObjects';

import { previewModelFromCatalogItem } from './pixelSheetPreviewModel';

const sampleItem = {
  sheetUrl: 'https://cdn.example/sheet.png',
  manifest: {
    format: PIXEL_OBJECT_FORMAT,
    canvas: { width: 16, height: 16 },
    sheet: {
      mediaId: '11111111-1111-4111-8111-111111111111',
      frameWidth: 16,
      frameHeight: 16,
      columns: 4,
      rows: 2,
      frameCount: 8,
    },
    animations: [
      {
        id: 'default' as const,
        loop: true as const,
        frames: [
          { frame: 0, durationMs: 100 },
          { frame: 1, durationMs: 100 },
        ],
      },
    ],
    staticPreviewFrame: 0,
  },
} satisfies Pick<PixelObjectDto, 'sheetUrl' | 'manifest'>;

describe('catalog preview model', () => {
  it('exposes clip frames for animation instead of the whole sheet', () => {
    const model = previewModelFromCatalogItem(sampleItem);

    expect(model.frameWidth).toBe(16);
    expect(model.frameHeight).toBe(16);
    expect(model.columns).toBe(4);
    expect(model.clip).toHaveLength(2);
    expect(model.clip[0]?.frame).toBe(0);
  });
});
