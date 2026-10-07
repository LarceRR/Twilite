import { spacing } from '../../spacing/spacing';

/** Top content padding for Screen; sheets skip the status-bar inset. */
export function screenTopPadding(safeAreaTop: number, skipTopSafeArea: boolean): number {
  return (skipTopSafeArea ? 0 : Math.max(safeAreaTop, 0)) + spacing.md;
}
