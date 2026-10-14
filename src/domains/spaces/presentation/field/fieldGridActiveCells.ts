import { currentThemeColors } from '@/design-system/colors/colors';

import { DEFAULT_FIELD_CONFIG, hexToRgbaTuple } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';

/** How many cells on each side of the center row are active. */
export const FIELD_ACTIVE_SIDE_SPAN = DEFAULT_FIELD_CONFIG.activeCells.sideSpan;

/** Initial active-cell fill, matching the current theme accent. */
export const FIELD_ACTIVE_FILL_HEX = currentThemeColors().accent;
export const FIELD_ACTIVE_FILL_RGBA = themeColorToRgbaTuple(FIELD_ACTIVE_FILL_HEX);

/** Bright pink mark at the center of each active cell (#ff1493). */
export const FIELD_ACTIVE_CENTER_HEX = DEFAULT_FIELD_CONFIG.activeCells.centerHex;
export const FIELD_ACTIVE_CENTER_RGBA = hexToRgbaTuple(FIELD_ACTIVE_CENTER_HEX);

/** Near-black ink for XY labels on base and active fills. */
export const FIELD_LABEL_TEXT_HEX = DEFAULT_FIELD_CONFIG.activeCells.labelTextHex;

/** Zero-based center row along Y (screen LTR axis). For 15 rows → 7. */
export function fieldGridCenterRow(rows: number): number {
  if (rows < 1) {
    throw new Error('Field grid rows must be positive');
  }
  return Math.floor((rows - 1) / 2);
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
  return themeColorToRgbaTuple(currentThemeColors().accent);
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

  throw new Error(`Unsupported theme accent color: ${value}`);
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
