export type SpritePlaceholderReason =
  | 'absent'
  | 'forbidden'
  | 'notFound'
  | 'network'
  | 'decode'
  | 'invalid';

export type SpriteAssetResolution = {
  readonly pixelObjectId: string;
  readonly revision: number | null;
  readonly dto: import('@/shared/contracts/pixelObjects').PixelObjectMobileDto | null;
  readonly source: 'embed' | 'fetch' | 'none';
  readonly reason: SpritePlaceholderReason | null;
};

/** Built-in deterministic placeholder geometry when a sprite cannot load (P4-S3). */
export const SPRITE_PLACEHOLDER_MOBILE = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Placeholder',
  format: 'twilite.pixelobject/v1' as const,
  sheetUrl: '',
  canvas: { width: 16, height: 16 },
  sheet: {
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
};

export function placeholderReasonFromHttpStatus(status: number): SpritePlaceholderReason {
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status >= 500) return 'network';
  return 'network';
}
