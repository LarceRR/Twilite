/**
 * Default public TPO limits — keep in sync with `@twilite/contracts@1.0.0`
 * (`twilite-backend/packages/contracts/src/limits.ts`).
 * Runtime prefers `GET /tpg/pixel-objects/limits`; these are fallbacks.
 */
export type PixelObjectLimits = {
  canvasMax: number;
  maxFrames: number;
  sheetMaxBytes: number;
  minFrameDurationMs: number;
  maxFrameDurationMs: number;
  titleMax: number;
  surfaceMax: number;
  supportedFormat: 'twilite.pixelobject/v1';
};

export const DEFAULT_PIXEL_OBJECT_LIMITS = {
  canvasMax: 160,
  maxFrames: 64,
  sheetMaxBytes: 8 * 1024 * 1024,
  minFrameDurationMs: 16,
  maxFrameDurationMs: 10_000,
  titleMax: 80,
  surfaceMax: 500,
  supportedFormat: 'twilite.pixelobject/v1',
} as const satisfies PixelObjectLimits;

export const PIXEL_OBJECT_FORMAT = DEFAULT_PIXEL_OBJECT_LIMITS.supportedFormat;
