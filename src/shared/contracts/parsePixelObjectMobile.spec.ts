import { describe, expect, it } from 'vitest';

import { parsePixelObjectMobileDto } from './parsePixelObjectMobile';

const valid = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Torch',
  revision: 2,
  format: 'twilite.pixelobject/v1',
  sheetUrl: 'https://cdn.example/sheet.png',
  previewUrl: null,
  canvas: { width: 16, height: 16 },
  sheet: { frameWidth: 16, frameHeight: 16, columns: 2, rows: 1, frameCount: 2 },
  animations: [
    {
      id: 'default',
      loop: true,
      frames: [
        { frame: 0, durationMs: 100 },
        { frame: 1, durationMs: 100 },
      ],
    },
  ],
  staticPreviewFrame: 0,
};

describe('parsePixelObjectMobileDto', () => {
  it('accepts a valid mobile dto', () => {
    const parsed = parsePixelObjectMobileDto(valid);
    expect(parsed?.id).toBe(valid.id);
    expect(parsed?.revision).toBe(2);
  });

  it('rejects wrong format', () => {
    expect(parsePixelObjectMobileDto({ ...valid, format: 'other' })).toBeNull();
  });

  it('rejects missing sheetUrl', () => {
    expect(parsePixelObjectMobileDto({ ...valid, sheetUrl: '' })).toBeNull();
  });
});
