import type { SurfaceObjectMetadata } from '@/domains/surface-objects/domain/entities/SurfaceObject';

export const PIXEL_OBJECT_METADATA_KEY = 'pixelObjectId' as const;

export function readPixelObjectId(metadata: SurfaceObjectMetadata): string | null {
  const value = metadata[PIXEL_OBJECT_METADATA_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
