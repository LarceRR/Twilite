import { relativeLuminance } from './parseHexRgb';
import type { AppThemePack } from './types';

const SURFACE_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Dark chrome when surface (or sky horizon fallback) is below mid luminance.
 */
export function isDarkPack(pack: AppThemePack): boolean {
  const surface = pack.colors.surface.trim();
  if (SURFACE_HEX.test(surface)) {
    const lum = relativeLuminance(surface);
    if (lum !== null) {
      return lum < 0.45;
    }
  }

  const horizon = pack.sceneBackgroundColors[pack.sceneBackgroundColors.length - 1];
  const horizonLum = relativeLuminance(horizon ?? '#808080');
  return (horizonLum ?? 0.5) < 0.45;
}

export function skyHorizonColor(pack: AppThemePack): string {
  const stops = pack.sceneBackgroundColors;
  return stops[stops.length - 1] ?? pack.colors.surface;
}
