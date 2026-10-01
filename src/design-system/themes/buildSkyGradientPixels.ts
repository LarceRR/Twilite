import { parseHexRgb, type Rgb } from './parseHexRgb';

function lerpChannel(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * t);
}

function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return {
    r: lerpChannel(from.r, to.r, t),
    g: lerpChannel(from.g, to.g, t),
    b: lerpChannel(from.b, to.b, t),
  };
}

function colorAtStops(stops: readonly Rgb[], t: number): Rgb {
  if (stops.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  if (stops.length === 1 || t <= 0) {
    return stops[0]!;
  }
  if (t >= 1) {
    return stops[stops.length - 1]!;
  }

  const scaled = t * (stops.length - 1);
  const index = Math.floor(scaled);
  const localT = scaled - index;
  const from = stops[index]!;
  const to = stops[Math.min(index + 1, stops.length - 1)]!;
  return mixRgb(from, to, localT);
}

/**
 * Builds RGBA pixels for a vertical sky gradient (row 0 = top).
 * Returns null when any stop is not parseable #RRGGBB.
 */
export function buildSkyGradientPixels(
  stops: readonly string[],
  width: number,
  height: number,
): Uint8Array | null {
  if (width < 1 || height < 1 || stops.length < 2) {
    return null;
  }

  const rgbStops: Rgb[] = [];
  for (const stop of stops) {
    const rgb = parseHexRgb(stop);
    if (rgb === null) {
      return null;
    }
    rgbStops.push(rgb);
  }

  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const t = height === 1 ? 0 : y / (height - 1);
    const { r, g, b } = colorAtStops(rgbStops, t);
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
}
