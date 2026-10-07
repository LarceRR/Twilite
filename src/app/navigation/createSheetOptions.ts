import { FORM_SHEET_CORNER_RADIUS } from '@/app/navigation/formSheetCornerRadius';

/**
 * Root-stack options for the create flow.
 * Lives outside `(tabs)` so the native sheet overlays the tab bar on iOS and Android.
 */
export const CREATE_SHEET_SCREEN_OPTIONS = {
  presentation: 'formSheet' as const,
  headerShown: false,
  /** One resting height: nothing taller to drag into. Swipe down still dismisses. */
  sheetAllowedDetents: [0.4],
  sheetExpandsWhenScrolledToEdge: false,
  sheetGrabberVisible: true,
  sheetCornerRadius: FORM_SHEET_CORNER_RADIUS,
  /**
   * formSheet hosts can report 0×0 layout without an explicit height, so
   * children (including Fast Refresh updates) never paint.
   * @see https://github.com/software-mansion/react-native-screens/issues/2522
   */
  contentStyle: { height: '100%' as const },
};
