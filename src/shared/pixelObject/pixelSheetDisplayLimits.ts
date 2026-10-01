/** Max on-screen box for a single spritesheet frame (catalog + near-camera field). */
export const PIXEL_SHEET_MAX_DISPLAY_PX = 90;

export type PixelSheetFitSize = {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
};

/**
 * Field sprite budget from projected cell width (perspective).
 * Near camera ≤ {@link PIXEL_SHEET_MAX_DISPLAY_PX}; farther cells shrink,
 * with a mild extra taper per bridge row.
 */
export function fieldSpriteBoxPx(
  cellPx: number,
  maxPx: number = PIXEL_SHEET_MAX_DISPLAY_PX,
  cellRow = 0,
): number {
  // ~4% extra shrink per row on top of perspective projection.
  const depthTaper = 1 / (1 + Math.max(0, cellRow) * 0.04);
  return Math.min(maxPx, Math.max(2, cellPx * 0.92 * depthTaper));
}

/**
 * Fit a frame inside `maxBoxPx`×`maxBoxPx` (contain). Never crops.
 * `maxBoxPx` is the caller's perspective-scaled budget (already capped near camera).
 */
export function pixelSheetFitSize(
  maxBoxPx: number,
  frameWidth: number,
  frameHeight: number,
): PixelSheetFitSize {
  const box = Math.max(1, maxBoxPx);
  const fw = Math.max(1, frameWidth);
  const fh = Math.max(1, frameHeight);
  const scale = Math.min(box / fw, box / fh);
  return {
    scale,
    width: fw * scale,
    height: fh * scale,
  };
}
