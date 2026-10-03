/** How many cells on each side of the center row are active. */
export const FIELD_ACTIVE_SIDE_SPAN = 2;

/** Active cell fill (#fdba2f). */
export const FIELD_ACTIVE_FILL_HEX = '#fdba2f';
export const FIELD_ACTIVE_FILL_RGBA = [253, 186, 47, 255] as const;

/** Bright pink mark at the center of each active cell (#ff1493). */
export const FIELD_ACTIVE_CENTER_HEX = '#ff1493';
export const FIELD_ACTIVE_CENTER_RGBA = [255, 20, 147, 255] as const;

/** Near-black ink for XY labels on base and active fills. */
export const FIELD_LABEL_TEXT_HEX = '#18151E';

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
  sideSpan: number = FIELD_ACTIVE_SIDE_SPAN,
): boolean {
  const center = fieldGridCenterRow(rows);
  return Math.abs(row - center) <= sideSpan;
}

export function isActiveFieldGridCell(
  row: number,
  rows: number,
  sideSpan: number = FIELD_ACTIVE_SIDE_SPAN,
): boolean {
  return isActiveFieldGridRow(row, rows, sideSpan);
}
