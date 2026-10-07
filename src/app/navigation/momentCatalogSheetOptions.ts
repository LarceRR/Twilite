import { FORM_SHEET_CORNER_RADIUS } from '@/app/navigation/formSheetCornerRadius';
import { CATALOG_SHEET_HEIGHT_FRACTION } from '@/domains/moments/presentation/catalogSheetViewport';

/**
 * Catalog frame is 780pt tall on an 844pt phone, so the sheet rests just under
 * the status bar. Pushed from the create sheet, this stacks a second form sheet.
 */
export const MOMENT_CATALOG_SHEET_DETENT = CATALOG_SHEET_HEIGHT_FRACTION;

export const MOMENT_CATALOG_SHEET_OPTIONS = {
  presentation: 'formSheet' as const,
  headerShown: false,
  sheetAllowedDetents: [MOMENT_CATALOG_SHEET_DETENT],
  sheetExpandsWhenScrolledToEdge: false,
  sheetGrabberVisible: true,
  sheetCornerRadius: FORM_SHEET_CORNER_RADIUS,
  /**
   * formSheet hosts can report 0×0 layout without an explicit height, so
   * children never paint.
   * @see https://github.com/software-mansion/react-native-screens/issues/2522
   */
  contentStyle: { flex: 1, height: '100%' as const, width: '100%' as const },
};
