import type {
  PixelObjectDto,
  PixelObjectMobileDto,
} from '@/shared/contracts/pixelObjects';
import { PIXEL_OBJECT_FORMAT } from '@/shared/contracts/limits';

import type { PixelObjectCatalogRepository } from '../../domain/repositories/PixelObjectCatalogRepository';

const FIXTURE_ID = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-10-01T12:00:00.000Z';

/** Deterministic 1×1 transparent PNG (base64). */
const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const fixtureManifest = {
  format: PIXEL_OBJECT_FORMAT,
  canvas: { width: 16, height: 16 },
  sheet: {
    mediaId: '22222222-2222-4222-8222-222222222222',
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    frameCount: 1,
  },
  animations: [
    {
      id: 'default' as const,
      loop: true as const,
      frames: [{ frame: 0, durationMs: 1000 }],
    },
  ],
  staticPreviewFrame: 0,
} as const;

const fixtureCatalogItem: PixelObjectDto = {
  id: FIXTURE_ID,
  title: 'Sandbox Torch',
  authorDisplayName: 'Local',
  authorUserId: '33333333-3333-4333-8333-333333333333',
  status: 'published',
  rejectionComment: null,
  revision: 1,
  manifest: fixtureManifest,
  sheetUrl: TINY_PNG_DATA_URI,
  previewUrl: TINY_PNG_DATA_URI,
  createdAt: NOW,
  updatedAt: NOW,
  reviewedAt: NOW,
};

const fixtureMobile: PixelObjectMobileDto = {
  id: FIXTURE_ID,
  title: 'Sandbox Torch',
  revision: 1,
  format: PIXEL_OBJECT_FORMAT,
  sheetUrl: TINY_PNG_DATA_URI,
  previewUrl: TINY_PNG_DATA_URI,
  canvas: fixtureManifest.canvas,
  sheet: {
    frameWidth: 16,
    frameHeight: 16,
    columns: 1,
    rows: 1,
    frameCount: 1,
  },
  animations: fixtureManifest.animations,
  staticPreviewFrame: 0,
};

/** Local sandbox catalog with one deterministic fixture (P4-S11). */
export function createLocalPixelObjectCatalogRepository(): PixelObjectCatalogRepository {
  return {
    listPublished: async () => [fixtureCatalogItem],
    getMobile: async (id) => {
      if (id !== FIXTURE_ID) {
        throw new Error(`Unknown sandbox pixel object: ${id}`);
      }
      return fixtureMobile;
    },
  };
}
