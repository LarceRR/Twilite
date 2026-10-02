export type ShouldShowScreenBackInput = {
  readonly hideBack: boolean;
  /** Only the focused route owns the back control during interactive pop. */
  readonly isFocused: boolean;
  readonly isTabRoot: boolean;
  readonly canGoBack: boolean;
};

/**
 * Back chevron visibility for in-content Screen headers.
 * Requires focus so the underneath screen does not flash a chevron mid swipe-back.
 */
export function shouldShowScreenBack({
  hideBack,
  isFocused,
  isTabRoot,
  canGoBack,
}: ShouldShowScreenBackInput): boolean {
  return isFocused && !hideBack && !isTabRoot && canGoBack;
}
