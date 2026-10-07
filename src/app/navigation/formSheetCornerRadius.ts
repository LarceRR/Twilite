import { spacing } from '@/design-system/spacing/spacing';

/**
 * Shared native form-sheet corner radius.
 * Nested iOS form sheets tend to keep the presenting sheet’s radius, so every
 * sheet in the create → catalog → filters stack must use the same value.
 */
export const FORM_SHEET_CORNER_RADIUS = spacing.xxxl;
