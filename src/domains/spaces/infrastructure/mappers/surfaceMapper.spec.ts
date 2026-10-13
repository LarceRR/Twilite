import { describe, expect, it } from 'vitest';

import { parseSurfaceSnapshot } from './surfaceMapper';

const objectId = '123e4567-e89b-12d3-a456-426614174000';
const sheetPath = `/v1/tpg/pixel-objects/${objectId}/revisions/2/sheet`;
const pixelObject = {
  id: objectId,
  title: 'Тёплый свет',
  format: 'twilite.pixelobject/v1',
  sheetUrl: sheetPath,
  previewUrl: null,
  canvas: { width: 16, height: 16 },
  sheet: { frameWidth: 16, frameHeight: 16, columns: 1, rows: 1, frameCount: 1 },
  animations: [{ id: 'default', loop: true, frames: [{ frame: 0, durationMs: 100 }] }],
  staticPreviewFrame: 0,
};

function snapshot(art: unknown = pixelObject) {
  return {
    surface: {
      id: 'surface-1',
      spaceId: 'space-1',
      bounds: { minX: 2, maxX: 2, minY: 7, maxY: 7 },
      version: 2,
    },
    objects: [
      {
        id: 'object-1',
        spaceId: 'space-1',
        surfaceId: 'surface-1',
        cellX: 2,
        cellY: 7,
        kind: 'Fire',
        state: 'Emerging',
        createdAt: '2026-10-13T12:00:00.000Z',
        version: 1,
        pixelObjectId: objectId,
        pixelObject: art,
      },
    ],
  };
}

describe('parseSurfaceSnapshot', () => {
  it('maps server coordinates and resolves the embedded sprite on the API origin', () => {
    const result = parseSurfaceSnapshot(snapshot(), 'https://api.example.test/v1');

    expect(result.objects[0]?.cell).toEqual({ x: 2, y: 7 });
    expect(result.objects[0]?.createdAt.toISOString()).toBe('2026-10-13T12:00:00.000Z');
    expect(result.objects[0]?.pixelObject?.sheetUrl).toBe(`https://api.example.test${sheetPath}`);
  });

  it('drops artwork with an untrusted image URL without dropping the placed object', () => {
    const result = parseSurfaceSnapshot(
      snapshot({ ...pixelObject, sheetUrl: 'https://attacker.test/collect' }),
      'https://api.example.test/v1',
    );

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]?.pixelObject).toBeNull();
  });

  it('rejects malformed placement coordinates', () => {
    const raw = snapshot();
    const object = raw.objects[0];
    if (object === undefined) throw new Error('Test object is missing');
    object.cellX = 2.5;

    expect(() => parseSurfaceSnapshot(raw, 'https://api.example.test/v1')).toThrow(
      /некорректный объект/,
    );
  });
});
