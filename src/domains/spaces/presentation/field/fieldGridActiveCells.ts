import { DEFAULT_FIELD_CONFIG, hexToRgbaTuple } from './fieldConfig';
import { getFieldConfig } from './fieldConfigStore';

/** How many cells on each side of the center row are active. */
export const FIELD_ACTIVE_SIDE_SPAN = DEFAULT_FIELD_CONFIG.activeCells.sideSpan;

/** Active cell fill (#fdba2f). */
export const FIELD_ACTIVE_FILL_HEX = DEFAULT_FIELD_CONFIG.activeCells.fillHex;
export const FIELD_ACTIVE_FILL_RGBA = hexToRgbaTuple(FIELD_ACTIVE_FILL_HEX);

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
  return hexToRgbaTuple(getFieldConfig().activeCells.fillHex);
}

export function fieldActiveCenterRgba(): readonly [number, number, number, number] {
  return hexToRgbaTuple(getFieldConfig().activeCells.centerHex);
}

export function fieldLabelTextHex(): string {
  return getFieldConfig().activeCells.labelTextHex;
}
