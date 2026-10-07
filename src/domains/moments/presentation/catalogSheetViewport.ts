/** Catalog sheet frame height on the 844pt reference device from design. */
export const CATALOG_SHEET_HEIGHT_FRACTION = 780 / 844;

/**
 * Native form sheets sometimes report 0 height to flex children while the
 * detent is already known. Pin the scroll host to the design fraction so
 * stacked sheets still paint their content.
 */
export function catalogSheetViewportMinHeight(windowHeight: number): number {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) return 1;
  return Math.max(1, Math.round(windowHeight * CATALOG_SHEET_HEIGHT_FRACTION));
}
