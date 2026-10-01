export type Rgb = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

export function parseHexRgb(hex: string): Rgb | null {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length !== 6) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { r, g, b };
}

export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (rgb === null) {
    return null;
  }

  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}
