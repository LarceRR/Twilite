import { DEFAULT_FIELD_CONFIG, hexToRgbaTuple } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';

/** How many cells on each side of the center row are active. */
export const FIELD_ACTIVE_SIDE_SPAN = DEFAULT_FIELD_CONFIG.activeCells.sideSpan;

/** Default active-cell fill color; the developer config can override it at runtime. */
export const FIELD_ACTIVE_FILL_HEX = DEFAULT_FIELD_CONFIG.activeCells.fillHex;
export const FIELD_ACTIVE_FILL_RGBA = hexToRgbaTuple(FIELD_ACTIVE_FILL_HEX);

/** Default color for the center mark of each active cell. */
export const FIELD_ACTIVE_CENTER_HEX = DEFAULT_FIELD_CONFIG.activeCells.centerHex;
export const FIELD_ACTIVE_CENTER_RGBA = hexToRgbaTuple(FIELD_ACTIVE_CENTER_HEX);

/** Default color for grid labels on base and active fills. */
export const FIELD_LABEL_TEXT_HEX = DEFAULT_FIELD_CONFIG.activeCells.labelTextHex;

/** Zero-based center row along Y (screen LTR axis). For 15 rows → 7. */
export function fieldGridCenterRow(rows: number): number {
  if (rows < 1) {
    throw new Error('Field grid rows must be positive');
  }
  return Math.floor((rows - 1) / 2);
}

/**
 * Returns a stable luminance multiplier that fades symmetrically from the center row.
 * The center row stays bright; each row farther away becomes progressively darker.
 */
const FIELD_SIDE_TILE_BRIGHTNESS_FALLOFF = 0.58;
const FIELD_SIDE_TILE_MIN_BRIGHTNESS = 0.1;

export function fieldGridSideBrightness(
  row: number,
  rows: number,
  sideSpan: number = getFieldConfig().activeCells.sideSpan,
): number {
  const center = fieldGridCenterRow(rows);
  const distanceFromCenter = Math.abs(row - center);
  return Math.max(
    FIELD_SIDE_TILE_MIN_BRIGHTNESS,
    FIELD_SIDE_TILE_BRIGHTNESS_FALLOFF ** distanceFromCenter,
  );
}

/** Active band: center row ± sideSpan (inclusive). */
export function isActiveFieldGridRow(
  row: number,
  rows: number,
  sideSpan?: number,
): boolean {
  const span = sideSpan ?? getFieldConfig().activeCells.sideSpan;
  const center = fieldGridCenterRow(rows);
  return Math.abs(row - center) <= span;
}

export function isActiveFieldGridCell(
  row: number,
  rows: number,
  sideSpan?: number,
): boolean {
  return isActiveFieldGridRow(row, rows, sideSpan);
}

export function fieldActiveFillRgba(): readonly [number, number, number, number] {
  return hexToRgbaTuple(getFieldConfig().activeCells.fillHex);
}

/** Composite a translucent theme color over an opaque surface for texture rendering. */
export function compositeThemeColorOver(foreground: string, background: string): string {
  const [foregroundRed, foregroundGreen, foregroundBlue, foregroundAlphaValue] =
    themeColorToRgbaTuple(foreground);
  const [backgroundRed, backgroundGreen, backgroundBlue, backgroundAlphaValue] =
    themeColorToRgbaTuple(background);
  const foregroundAlpha = foregroundAlphaValue / 255;
  const backgroundAlpha = backgroundAlphaValue / 255;
  const outputAlpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);

  const toHex = (foregroundChannel: number, backgroundChannel: number): string => {
    const channel =
      outputAlpha === 0
        ? 0
        : (foregroundChannel * foregroundAlpha +
            backgroundChannel * backgroundAlpha * (1 - foregroundAlpha)) /
          outputAlpha;
    return Math.round(channel).toString(16).padStart(2, '0');
  };

  return `#${toHex(foregroundRed, backgroundRed)}${toHex(foregroundGreen, backgroundGreen)}${toHex(foregroundBlue, backgroundBlue)}`;
}

/** Converts the CSS color formats allowed by theme packs to a pixel RGBA tuple. */
export function themeColorToRgbaTuple(
  color: string,
): readonly [number, number, number, number] {
  const value = color.trim();
  const hex = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(value);
  if (hex !== null) {
    const rgb = hex[1]!;
    return [
      Number.parseInt(rgb.slice(0, 2), 16),
      Number.parseInt(rgb.slice(2, 4), 16),
      Number.parseInt(rgb.slice(4, 6), 16),
      hex[2] === undefined ? 255 : Number.parseInt(hex[2], 16),
    ];
  }

  const rgba = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+|1\.0+)\s*\)$/i.exec(value);
  if (rgba !== null) {
    return [
      clampColorChannel(rgba[1]!),
      clampColorChannel(rgba[2]!),
      clampColorChannel(rgba[3]!),
      Math.round(Math.max(0, Math.min(1, Number.parseFloat(rgba[4]!))) * 255),
    ];
  }

  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value);
  if (rgb !== null) {
    return [
      clampColorChannel(rgb[1]!),
      clampColorChannel(rgb[2]!),
      clampColorChannel(rgb[3]!),
      255,
    ];
  }

  throw new Error(`Unsupported theme color: ${value}`);
}

function clampColorChannel(channel: string): number {
  return Math.max(0, Math.min(255, Number.parseInt(channel, 10)));
}

export function fieldActiveCenterRgba(): readonly [number, number, number, number] {
  return hexToRgbaTuple(getFieldConfig().activeCells.centerHex);
}

export function fieldLabelTextHex(): string {
  return getFieldConfig().activeCells.labelTextHex;
}
