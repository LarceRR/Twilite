import { DataTexture, RGBAFormat, UnsignedByteType, type Texture } from 'three';

import { buildSkyGradientPixels } from '@/design-system/themes';

const SKY_TEXTURE_WIDTH = 4;
const SKY_TEXTURE_HEIGHT = 64;

/** Creates a vertical sky DataTexture (top → bottom). Caller must dispose. */
export function createSkyBackgroundTexture(stops: readonly string[]): Texture | null {
  const pixels = buildSkyGradientPixels(stops, SKY_TEXTURE_WIDTH, SKY_TEXTURE_HEIGHT);
  if (pixels === null) {
    return null;
  }

  const texture = new DataTexture(
    pixels,
    SKY_TEXTURE_WIDTH,
    SKY_TEXTURE_HEIGHT,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.needsUpdate = true;
  texture.flipY = false;
  return texture;
}
