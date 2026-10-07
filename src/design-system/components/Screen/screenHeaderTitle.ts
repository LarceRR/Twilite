/** Title rendered in the Screen chrome. `hideHeader` skips the route fallback. */
export function screenHeaderTitle(
  hideHeader: boolean,
  title: string | undefined,
  pathnameTitle: string | null,
): string | undefined {
  if (hideHeader) return undefined;
  return title ?? pathnameTitle ?? undefined;
}
