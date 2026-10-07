import { FORM_SHEET_CORNER_RADIUS } from '@/app/navigation/formSheetCornerRadius';
import { MOMENT_FILTERS_SHEET_HEIGHT_FRACTION } from '@/domains/moments/presentation/momentFilters';

/**
 * Compact filters sheet stacked above the moment catalog form sheet.
 * Height matches the Figma frame (297pt on an 844pt phone).
 */
export const MOMENT_FILTERS_SHEET_DETENT = MOMENT_FILTERS_SHEET_HEIGHT_FRACTION;

export const MOMENT_FILTERS_SHEET_OPTIONS = {
  presentation: 'formSheet' as const,
  headerShown: false,
  sheetAllowedDetents: [MOMENT_FILTERS_SHEET_DETENT],
  sheetExpandsWhenScrolledToEdge: false,
  sheetGrabberVisible: true,
  sheetCornerRadius: FORM_SHEET_CORNER_RADIUS,
  /**
   * formSheet hosts can report 0×0 layout without an explicit height.
   * Keep the same shape as the compact create sheet so corner radius / frame
   * resolve the same way when this sheet is stacked.
   */
  contentStyle: { height: '100%' as const },
};
